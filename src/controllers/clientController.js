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

    // Check if phone already taken
    const phoneTaken = await User.findOne({ phone });
    if (phoneTaken) {
      return res.status(400).json({ message: "A user with this phone number already exists" });
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
    const { clientName, companyName, email, phone, address, notes, password } = req.body;

    const client = await Client.findById(req.params.id);
    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }

    // ── Validation: reject empty strings for required fields ──
    if (clientName !== undefined && clientName.trim() === "") {
      return res.status(400).json({ message: "Client name cannot be empty" });
    }
    if (email !== undefined && email.trim() === "") {
      return res.status(400).json({ message: "Email cannot be empty" });
    }
    if (phone !== undefined && phone.trim() === "") {
      return res.status(400).json({ message: "Phone number cannot be empty" });
    }
    if (address !== undefined && address.trim() === "") {
      return res.status(400).json({ message: "Address cannot be empty" });
    }
    if (password !== undefined && password.trim() === "") {
      return res.status(400).json({ message: "Password cannot be empty" });
    }
    if (password !== undefined && password.trim().length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const normalizedEmail = email !== undefined ? email.toLowerCase().trim() : undefined;
    // Only treat as changed if it's actually different from what's stored
    const emailChanged = normalizedEmail !== undefined && normalizedEmail !== client.email;

    // ── Uniqueness checks — only when the value actually changed ──
    if (emailChanged) {
      // Check Client collection (exclude current client)
      const emailInClient = await Client.findOne({
        email: normalizedEmail,
        _id: { $ne: client._id },
      });
      if (emailInClient) {
        return res.status(400).json({ message: "A client with this email already exists" });
      }
      // Check User collection (exclude linked user)
      const emailInUser = await User.findOne({
        email: normalizedEmail,
        _id: { $ne: client.user },
      });
      if (emailInUser) {
        return res.status(400).json({ message: "A user with this email already exists" });
      }
    }

    const normalizedPhone = phone !== undefined ? phone.trim() : undefined;
    const phoneChanged = normalizedPhone !== undefined && normalizedPhone !== client.phone;

    if (phoneChanged) {
      const phoneTaken = await User.findOne({
        phone: normalizedPhone,
        _id: { $ne: client.user },
      });
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

    // ── Apply changes directly to the document ──
    if (clientName !== undefined) client.clientName = clientName.trim();
    if (companyName !== undefined) client.companyName = companyName.trim();
    if (normalizedEmail !== undefined) client.email = normalizedEmail;
    if (normalizedPhone !== undefined) client.phone = normalizedPhone;
    if (address !== undefined) client.address = address.trim();
    if (notes !== undefined) client.notes = notes.trim();

    // Bypass unique-index self-conflict: tell Mongoose not to re-validate unique fields
    await Client.collection.updateOne(
      { _id: client._id },
      {
        $set: {
          clientName: client.clientName,
          companyName: client.companyName,
          email: client.email,
          phone: client.phone,
          address: client.address,
          notes: client.notes,
          profileImage: client.profileImage,
        },
      }
    );

    // ── Sync User document ──
    const userUpdate = {};
    if (clientName !== undefined) userUpdate.name = clientName.trim();
    if (normalizedEmail !== undefined) userUpdate.email = normalizedEmail;
    if (normalizedPhone !== undefined) userUpdate.phone = normalizedPhone;
    if (req.file) {
      userUpdate["profileImage.url"] = req.file.path;
      userUpdate["profileImage.publicId"] = req.file.filename;
    }
    if (password !== undefined) {
      userUpdate.password = await bcrypt.hash(password.trim(), 10);
    }

    if (client.user && Object.keys(userUpdate).length > 0) {
      await User.collection.updateOne({ _id: client.user }, { $set: userUpdate });
    }

    // ── Fetch fresh populated response ──
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
      const notifyEmail = normalizedEmail !== undefined ? normalizedEmail : client.email;
      sendClientPasswordUpdateEmail(notifyEmail, updatedClient.clientName, password.trim()).catch((err) => {
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
