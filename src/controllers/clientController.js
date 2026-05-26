const Client = require("../models/Client");
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const { cloudinary } = require("../config/cloudinary");
const { sendClientWelcomeEmail } = require("../utils/sendEmail");

// POST /api/clients
exports.createClient = async (req, res) => {
  try {
    const { clientName, companyName, email, phone, address, notes, password } = req.body;

    if (!clientName || !email || !password) {
      return res.status(400).json({ message: "clientName, email, and password are required" });
    }

    // Check if email already taken in User collection
    const emailTaken = await User.findOne({ email: email.toLowerCase().trim() });
    if (emailTaken) {
      return res.status(400).json({ message: "A user with this email already exists" });
    }

    const profileImage = req.file
      ? { url: req.file.path, publicId: req.file.filename }
      : { url: "", publicId: "" };

    // Create User account for client login
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name: clientName,
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      role: "client",
      profileImage,
    });

    // Create Client record
    let client;
    try {
      client = await Client.create({
        clientName,
        companyName,
        email: email.toLowerCase().trim(),
        phone,
        address,
        notes,
        profileImage,
        user: user._id,
        createdBy: req.user._id,
      });
    } catch (clientError) {
      // Rollback: delete user if client creation fails
      await User.findByIdAndDelete(user._id);
      if (req.file && req.file.filename) {
        await cloudinary.uploader.destroy(req.file.filename).catch(() => {});
      }
      if (clientError.code === 11000) {
        return res.status(400).json({ message: "A client with this email already exists" });
      }
      throw clientError;
    }

    await client.populate("createdBy", "name email");

  
    sendClientWelcomeEmail(email, clientName, password).catch((err) => {
      console.error("Failed to send client welcome email:", err.message);
    });

    res.status(201).json(client);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "A client with this email already exists" });
    }
    res.status(500).json({ message: error.message });
  }
};

// GET /api/clients
exports.getClients = async (_req, res) => {
  try {
    const clients = await Client.find()
      .populate("createdBy", "name email")
      .populate("user", "name email profileImage")
      .sort({ createdAt: -1 });
    res.json(clients);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/clients/:id
exports.getClientById = async (req, res) => {
  try {
    const client = await Client.findById(req.params.id)
      .populate("createdBy", "name email")
      .populate("user", "name email profileImage");
    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }
    res.json(client);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PUT /api/clients/:id
exports.updateClient = async (req, res) => {
  try {
    const { clientName, companyName, email, phone, address, notes } = req.body;

    const client = await Client.findById(req.params.id);
    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }

 
    if (email && email.toLowerCase().trim() !== client.email) {
      const existing = await User.findOne({
        email: email.toLowerCase().trim(),
        _id: { $ne: client.user },
      });
      if (existing) {
        return res.status(400).json({ message: "A user with this email already exists" });
      }
    }

    // Handle new profile image
    if (req.file) {
      if (client.profileImage && client.profileImage.publicId) {
        await cloudinary.uploader.destroy(client.profileImage.publicId).catch(() => {});
      }
      const newImage = { url: req.file.path, publicId: req.file.filename };
      client.profileImage = newImage;

      // Sync image to linked User as well
      if (client.user) {
        await User.findByIdAndUpdate(client.user, {
          $set: { "profileImage.url": req.file.path, "profileImage.publicId": req.file.filename },
        });
      }
    }

    if (clientName !== undefined) {
      client.clientName = clientName;
      if (client.user) await User.findByIdAndUpdate(client.user, { $set: { name: clientName } });
    }
    if (companyName !== undefined) client.companyName = companyName;
    if (email !== undefined) {
      client.email = email;
      if (client.user) await User.findByIdAndUpdate(client.user, { $set: { email: email.toLowerCase().trim() } });
    }
    if (phone !== undefined) client.phone = phone;
    if (address !== undefined) client.address = address;
    if (notes !== undefined) client.notes = notes;

    await client.save();
    await client.populate([
      { path: "createdBy", select: "name email" },
      { path: "user", select: "name email profileImage" },
    ]);

    res.json(client);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "A client with this email already exists" });
    }
    res.status(500).json({ message: error.message });
  }
};

// DELETE /api/clients/:id
exports.deleteClient = async (req, res) => {
  try {
    const client = await Client.findByIdAndDelete(req.params.id);
    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }

    // Delete linked User account
    if (client.user) {
      await User.findByIdAndDelete(client.user);
    }

   
    if (client.profileImage && client.profileImage.publicId) {
      await cloudinary.uploader.destroy(client.profileImage.publicId).catch(() => {});
    }

    res.json({ message: "Client deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
