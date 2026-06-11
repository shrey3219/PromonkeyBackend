const Client = require("../models/Client");
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const { cloudinary } = require("../config/cloudinary");
const { sendClientWelcomeEmail, sendClientEmailUpdateEmail, sendClientPasswordUpdateEmail } = require("../utils/sendEmail");

// POST /api/clients
exports.createClient = async (req, res) => {
  try {
    const { clientName, companyName, email, phone, address, notes, password } = req.body;

    if (!clientName || !email || !password || !phone || !address) {
      return res.status(400).json({ message: "clientName, email, phone, address, and password are required" });
    }

    const emailTaken = await User.findOne({ email: email.toLowerCase().trim() });
    if (emailTaken) {
      return res.status(400).json({ message: "A user with this email already exists" });
    }

    const phoneTaken = await User.findOne({ phone });
    if (phoneTaken) {
      return res.status(400).json({ message: "A user with this phone number already exists" });
    }

    const profileImage = req.file
      ? { url: req.file.path, publicId: req.file.filename }
      : { url: "", publicId: "" };

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name: clientName,
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      role: "client",
      profileImage,
    });

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


    const clientName  = req.body.clientName  !== undefined ? String(req.body.clientName).trim()  : undefined;
    const companyName = req.body.companyName !== undefined ? String(req.body.companyName).trim()  : undefined;
    const email       = req.body.email       !== undefined ? String(req.body.email).trim()        : undefined;
    const phone       = req.body.phone       !== undefined ? String(req.body.phone).trim()        : undefined;
    const address     = req.body.address     !== undefined ? String(req.body.address).trim()      : undefined;
    const notes       = req.body.notes       !== undefined ? String(req.body.notes).trim()        : undefined;
    const password    = req.body.password    !== undefined ? String(req.body.password).trim()     : undefined;

    const client = await Client.findById(req.params.id);
    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }

    // ── Validate: required fields cannot be empty if provided ──
    if (clientName  !== undefined && clientName  === "") return res.status(400).json({ message: "Client name cannot be empty" });
    if (email       !== undefined && email       === "") return res.status(400).json({ message: "Email cannot be empty" });
    if (phone       !== undefined && phone       === "") return res.status(400).json({ message: "Phone number cannot be empty" });
    if (address     !== undefined && address     === "") return res.status(400).json({ message: "Address cannot be empty" });
    if (password    !== undefined && password    === "") return res.status(400).json({ message: "Password cannot be empty" });
    if (password    !== undefined && password.length < 6) return res.status(400).json({ message: "Password must be at least 6 characters" });

    // ── Normalize email and detect change ──
    // At this point email is either undefined or a non-empty trimmed string (empty string caught above)
    const normalizedEmail = (email !== undefined && email !== "") ? email.toLowerCase() : undefined;
    const emailChanged = normalizedEmail !== undefined && normalizedEmail !== client.email;

    // ── Uniqueness checks only when actually changing ──
    if (emailChanged) {
      const emailInClient = await Client.findOne({ email: normalizedEmail, _id: { $ne: client._id } });
      if (emailInClient) {
        return res.status(400).json({ message: "A client with this email already exists" });
      }
      const emailInUser = await User.findOne({ email: normalizedEmail, _id: { $ne: client.user } });
      if (emailInUser) {
        return res.status(400).json({ message: "A user with this email already exists" });
      }
    }

    const phoneChanged = phone !== undefined && phone !== client.phone;
    if (phoneChanged) {
      const phoneTaken = await User.findOne({ phone, _id: { $ne: client.user } });
      if (phoneTaken) {
        return res.status(400).json({ message: "A user with this phone number already exists" });
      }
    }

    // ── Handle profile image upload ──
    if (req.file) {
      if (client.profileImage && client.profileImage.publicId) {
        await cloudinary.uploader.destroy(client.profileImage.publicId).catch(() => {});
      }
      client.profileImage = { url: req.file.path, publicId: req.file.filename };
    }

    // ── Build $set for Client — only include fields that were provided ──
    const clientSet = {};
    if (clientName    !== undefined) clientSet.clientName  = clientName;
    if (companyName   !== undefined) clientSet.companyName = companyName;
    if (normalizedEmail !== undefined) clientSet.email     = normalizedEmail;
    if (phone         !== undefined) clientSet.phone       = phone;
    if (address       !== undefined) clientSet.address     = address;
    if (notes         !== undefined) clientSet.notes       = notes;
    if (req.file)                    clientSet.profileImage = client.profileImage;

    // Use native driver to skip Mongoose's unique-index validator (we already checked manually above)
    if (Object.keys(clientSet).length > 0) {
      await Client.collection.updateOne({ _id: client._id }, { $set: clientSet });
    }

    // ── Build $set for linked User ──
    const userSet = {};
    if (clientName      !== undefined) userSet.name  = clientName;
    if (normalizedEmail !== undefined) userSet.email = normalizedEmail;
    if (phone           !== undefined) userSet.phone = phone;
    if (req.file) {
      userSet["profileImage.url"]      = req.file.path;
      userSet["profileImage.publicId"] = req.file.filename;
    }
    if (password !== undefined) {
      userSet.password = await bcrypt.hash(password, 10);
    }

    if (client.user && Object.keys(userSet).length > 0) {
      await User.collection.updateOne({ _id: client.user }, { $set: userSet });
    }

    // ── Return fresh populated document ──
    const updatedClient = await Client.findById(client._id)
      .populate("createdBy", "name email")
      .populate("user", "name email profileImage");

    // ── Send notifications ──
    if (emailChanged) {
      sendClientEmailUpdateEmail(normalizedEmail, updatedClient.clientName).catch((err) => {
        console.error("Email update notification failed:", err.message);
      });
    }

    if (password !== undefined) {
      const notifyEmail = normalizedEmail ?? client.email;
      sendClientPasswordUpdateEmail(notifyEmail, updatedClient.clientName, password).catch((err) => {
        console.error("Password update notification failed:", err.message);
      });
    }

    res.json(updatedClient);
  } catch (error) {
    console.error("updateClient error:", error);
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
