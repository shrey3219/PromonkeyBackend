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
    const {
      clientName,
      companyName,
      email,
      phone,
      address,
      notes,
      password,
    } = req.body;

    const client = await Client.findById(req.params.id);

    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }

    // Trim values
    const trimmedClientName = clientName?.trim();
    const trimmedCompanyName = companyName?.trim();
    const trimmedEmail = email?.trim().toLowerCase();
    const trimmedPhone = phone?.trim();
    const trimmedAddress = address?.trim();
    const trimmedNotes = notes?.trim();
    const trimmedPassword = password?.trim();

    // Validation
    if (clientName !== undefined && !trimmedClientName) {
      return res
        .status(400)
        .json({ message: "Client name cannot be empty" });
    }

    if (email !== undefined && !trimmedEmail) {
      return res.status(400).json({ message: "Email cannot be empty" });
    }

    if (phone !== undefined && !trimmedPhone) {
      return res
        .status(400)
        .json({ message: "Phone number cannot be empty" });
    }

    if (address !== undefined && !trimmedAddress) {
      return res.status(400).json({ message: "Address cannot be empty" });
    }

    if (password !== undefined) {
      if (!trimmedPassword) {
        return res.status(400).json({
          message: "Password cannot be empty",
        });
      }

      if (trimmedPassword.length < 6) {
        return res.status(400).json({
          message: "Password must be at least 6 characters",
        });
      }
    }

    // Email duplicate check
    if (
      trimmedEmail &&
      trimmedEmail !== client.email?.toLowerCase()
    ) {
      const existingClient = await Client.findOne({
        email: trimmedEmail,
        _id: { $ne: client._id },
      });

      if (existingClient) {
        return res.status(400).json({
          message: "A client with this email already exists",
        });
      }

      const existingUser = await User.findOne({
        email: trimmedEmail,
        _id: { $ne: client.user },
      });

      if (existingUser) {
        return res.status(400).json({
          message: "A user with this email already exists",
        });
      }
    }

    // Phone duplicate check
    if (
      trimmedPhone &&
      trimmedPhone !== client.phone
    ) {
      const existingPhone = await User.findOne({
        phone: trimmedPhone,
        _id: { $ne: client.user },
      });

      if (existingPhone) {
        return res.status(400).json({
          message: "A user with this phone number already exists",
        });
      }
    }

    // Profile image upload
    if (req.file) {
      if (client.profileImage?.publicId) {
        try {
          await cloudinary.uploader.destroy(
            client.profileImage.publicId
          );
        } catch (err) {
          console.log("Cloudinary delete error:", err.message);
        }
      }

      client.profileImage = {
        url: req.file.path,
        publicId: req.file.filename,
      };
    }

    // Update Client
    if (trimmedClientName !== undefined)
      client.clientName = trimmedClientName;

    if (trimmedCompanyName !== undefined)
      client.companyName = trimmedCompanyName;

    if (trimmedEmail !== undefined)
      client.email = trimmedEmail;

    if (trimmedPhone !== undefined)
      client.phone = trimmedPhone;

    if (trimmedAddress !== undefined)
      client.address = trimmedAddress;

    if (trimmedNotes !== undefined)
      client.notes = trimmedNotes;

    await client.save();

    // Update linked user
    if (client.user) {
      const user = await User.findById(client.user);

      if (user) {
        if (trimmedClientName !== undefined)
          user.name = trimmedClientName;

        if (trimmedEmail !== undefined)
          user.email = trimmedEmail;

        if (trimmedPhone !== undefined)
          user.phone = trimmedPhone;

        if (req.file) {
          user.profileImage = {
            url: req.file.path,
            publicId: req.file.filename,
          };
        }

        if (trimmedPassword) {
          user.password = await bcrypt.hash(
            trimmedPassword,
            10
          );
        }

        await user.save();
      }
    }

    const updatedClient = await Client.findById(client._id)
      .populate("createdBy", "name email")
      .populate("user", "name email profileImage");

    // Notification email
    if (
      trimmedEmail &&
      trimmedEmail !== client.email?.toLowerCase()
    ) {
      sendClientEmailUpdateEmail(
        trimmedEmail,
        updatedClient.clientName
      ).catch((err) =>
        console.log("Email notification error:", err.message)
      );
    }

    if (trimmedPassword) {
      sendClientPasswordUpdateEmail(
        updatedClient.email,
        updatedClient.clientName,
        trimmedPassword
      ).catch((err) =>
        console.log("Password notification error:", err.message)
      );
    }

    return res.status(200).json(updatedClient);
  } catch (error) {
    console.error("Update Client Error:", error);

    if (error.code === 11000) {
      return res.status(400).json({
        message: "Email already exists",
      });
    }

    return res.status(500).json({
      message: error.message,
    });
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
