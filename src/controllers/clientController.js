const Client = require("../models/Client");
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const { cloudinary } = require("../config/cloudinary");
const { sendClientWelcomeEmail, sendClientEmailUpdateEmail, sendClientPasswordUpdateEmail } = require("../utils/sendEmail");

// POST /api/clients
exports.createClient = async (req, res) => {
  try {
    const body = req.body || {};
    const { clientName, companyName, email, phone, address, notes, password } = body;

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
      throw clientError;
    }

    await client.populate([
      { path: "createdBy", select: "name email" },
      { path: "user", select: "name email profileImage" },
    ]);

    sendClientWelcomeEmail(email, clientName, password).catch((err) => {
      console.error("Failed to send client welcome email:", err.message);
    });

    res.status(201).json(client);
  } catch (error) {
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
    const body = req.body || {};

    // Parse all fields — keep empty string as-is so validation can catch it
    const clientName  = body.clientName  !== undefined ? String(body.clientName).trim()  : undefined;
    const companyName = body.companyName !== undefined ? String(body.companyName).trim()  : undefined;
    const email       = body.email       !== undefined ? String(body.email).trim()        : undefined;
    const phone       = body.phone       !== undefined ? String(body.phone).trim()        : undefined;
    const address     = body.address     !== undefined ? String(body.address).trim()      : undefined;
    const notes       = body.notes       !== undefined ? String(body.notes).trim()        : undefined;
    const password    = body.password    !== undefined ? String(body.password).trim()     : undefined;

    // Nothing provided at all
    if (!req.file && [clientName, companyName, email, phone, address, notes, password].every(v => v === undefined)) {
      return res.status(400).json({ message: "No fields provided to update" });
    }

    const client = await Client.findById(req.params.id).populate("user", "_id email");
    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }

    // ── Validate: required fields cannot be sent as empty ──
    if (clientName !== undefined && clientName === "") return res.status(400).json({ message: "Client name cannot be empty" });
    if (email      !== undefined && email      === "") return res.status(400).json({ message: "Email cannot be empty" });
    if (phone      !== undefined && phone      === "") return res.status(400).json({ message: "Phone number cannot be empty" });
    if (address    !== undefined && address    === "") return res.status(400).json({ message: "Address cannot be empty" });
    if (password   !== undefined && password   === "") return res.status(400).json({ message: "Password cannot be empty" });
    if (password   !== undefined && password.length < 6) return res.status(400).json({ message: "Password must be at least 6 characters" });

    // ── Email lives only in User — check against User collection ──
    const currentEmail = client.user?.email || "";
    const normalizedEmail = email !== undefined ? email.toLowerCase() : undefined;
    const emailChanged = normalizedEmail !== undefined && normalizedEmail !== currentEmail;

    if (emailChanged) {
      const emailTaken = await User.findOne({ email: normalizedEmail, _id: { $ne: client.user._id } });
      if (emailTaken) {
        return res.status(400).json({ message: "A user with this email already exists" });
      }
    }

    // ── Phone uniqueness check ──
    const phoneChanged = phone !== undefined && phone !== client.phone;
    if (phoneChanged) {
      const phoneTaken = await User.findOne({ phone, _id: { $ne: client.user._id } });
      if (phoneTaken) {
        return res.status(400).json({ message: "A user with this phone number already exists" });
      }
    }

    // ── Handle profile image upload ──
    if (req.file) {
      if (client.profileImage?.publicId) {
        await cloudinary.uploader.destroy(client.profileImage.publicId).catch(() => {});
      }
      client.profileImage = { url: req.file.path, publicId: req.file.filename };
    }

    // ── Build $set for Client (no email field here) ──
    const clientSet = {};
    if (clientName  !== undefined) clientSet.clientName  = clientName;
    if (companyName !== undefined) clientSet.companyName = companyName;
    if (phone       !== undefined) clientSet.phone       = phone;
    if (address     !== undefined) clientSet.address     = address;
    if (notes       !== undefined) clientSet.notes       = notes;
    if (req.file)                  clientSet.profileImage = client.profileImage;

    if (Object.keys(clientSet).length > 0) {
      await Client.collection.updateOne({ _id: client._id }, { $set: clientSet });
    }

    // ── Build $set for User ──
    const userSet = {};
    if (clientName       !== undefined) userSet.name  = clientName;
    if (normalizedEmail  !== undefined) userSet.email = normalizedEmail;
    if (phone            !== undefined) userSet.phone = phone;
    if (req.file) {
      userSet["profileImage.url"]      = req.file.path;
      userSet["profileImage.publicId"] = req.file.filename;
    }
    if (password !== undefined) {
      userSet.password = await bcrypt.hash(password, 10);
    }

    if (client.user?._id && Object.keys(userSet).length > 0) {
      await User.collection.updateOne({ _id: client.user._id }, { $set: userSet });
    }

    // ── Return fresh populated response ──
    const updatedClient = await Client.findById(client._id)
      .populate("createdBy", "name email")
      .populate("user", "name email profileImage");

    if (!updatedClient) {
      return res.status(500).json({ message: "Failed to fetch updated client" });
    }

    // ── Send notifications ──
    if (emailChanged && normalizedEmail) {
      sendClientEmailUpdateEmail(normalizedEmail, updatedClient.clientName).catch((err) => {
        console.error("Email update notification failed:", err.message);
      });
    }

    if (password !== undefined) {
      const notifyEmail = normalizedEmail || currentEmail;
      if (notifyEmail) {
        sendClientPasswordUpdateEmail(notifyEmail, updatedClient.clientName, password).catch((err) => {
          console.error("Password update notification failed:", err.message);
        });
      }
    }

    res.json(updatedClient);
  } catch (error) {
    console.error("updateClient error:", error);
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

    if (client.profileImage?.publicId) {
      await cloudinary.uploader.destroy(client.profileImage.publicId).catch(() => {});
    }

    res.json({ message: "Client deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
