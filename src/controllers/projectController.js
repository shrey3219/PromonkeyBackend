const Project = require("../models/Project");
const Client = require("../models/Client");
const { cloudinary } = require("../config/cloudinary");

// ─── Helper ────────────────────────────────────────────────────────────────────
const populateProject = (query) =>
  query
    .populate("client", "clientName companyName email phone profileImage")
    .populate("createdBy", "name email");

// ─── POST /api/projects ────────────────────────────────────────────────────────
exports.createProject = async (req, res) => {
  try {
    const {
      name,
      description,
      client,
      startDate,
      estimatedEndDate,
      status,
      priority,
      phases, // JSON string or array
    } = req.body;

    if (!name || !client || !startDate || !estimatedEndDate) {
      return res.status(400).json({
        message: "name, client, startDate, and estimatedEndDate are required",
      });
    }

    // Validate client exists
    const clientExists = await Client.findById(client);
    if (!clientExists) {
      return res.status(404).json({ message: "Client not found" });
    }

    // Parse phases if sent as JSON string (multipart form)
    let parsedPhases = [];
    if (phases) {
      try {
        parsedPhases = typeof phases === "string" ? JSON.parse(phases) : phases;
      } catch {
        return res.status(400).json({ message: "Invalid phases format. Must be a JSON array." });
      }
    }

    // Build requirementDocs from uploaded files
    const requirementDocs = (req.files || []).map((file) => ({
      name: file.originalname,
      url: file.path,
      publicId: file.filename,
      fileType: file.mimetype,
    }));

    const project = await Project.create({
      name,
      description,
      client,
      startDate,
      estimatedEndDate,
      status,
      priority,
      phases: parsedPhases,
      requirementDocs,
      createdBy: req.user._id,
    });

    const populated = await populateProject(Project.findById(project._id));
    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── GET /api/projects ─────────────────────────────────────────────────────────
exports.getProjects = async (req, res) => {
  try {
    const filter = {};

    // If logged-in user is a client, only show their projects
    if (req.user.role === "client") {
      const clientRecord = await Client.findOne({ user: req.user._id });
      if (!clientRecord) {
        return res.json([]);
      }
      filter.client = clientRecord._id;
    }

    // Optional query filters
    if (req.query.status) filter.status = req.query.status;
    if (req.query.priority) filter.priority = req.query.priority;
    if (req.query.client && req.user.role !== "client") filter.client = req.query.client;

    const projects = await populateProject(
      Project.find(filter).sort({ createdAt: -1 })
    );

    res.json(projects);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── GET /api/projects/:id ─────────────────────────────────────────────────────
exports.getProjectById = async (req, res) => {
  try {
    const project = await populateProject(Project.findById(req.params.id));
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    // Client can only view their own project
    if (req.user.role === "client") {
      const clientRecord = await Client.findOne({ user: req.user._id });
      if (!clientRecord || project.client._id.toString() !== clientRecord._id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }
    }

    res.json(project);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── PUT /api/projects/:id ─────────────────────────────────────────────────────
exports.updateProject = async (req, res) => {
  try {
    const {
      name,
      description,
      client,
      startDate,
      estimatedEndDate,
      actualEndDate,
      status,
      priority,
      phases,
    } = req.body;

    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    if (client) {
      const clientExists = await Client.findById(client);
      if (!clientExists) {
        return res.status(404).json({ message: "Client not found" });
      }
      project.client = client;
    }

    if (name !== undefined) project.name = name;
    if (description !== undefined) project.description = description;
    if (startDate !== undefined) project.startDate = startDate;
    if (estimatedEndDate !== undefined) project.estimatedEndDate = estimatedEndDate;
    if (actualEndDate !== undefined) project.actualEndDate = actualEndDate;
    if (status !== undefined) project.status = status;
    if (priority !== undefined) project.priority = priority;

    if (phases !== undefined) {
      try {
        project.phases = typeof phases === "string" ? JSON.parse(phases) : phases;
      } catch {
        return res.status(400).json({ message: "Invalid phases format. Must be a JSON array." });
      }
    }

    // Append any newly uploaded docs
    if (req.files && req.files.length > 0) {
      const newDocs = req.files.map((file) => ({
        name: file.originalname,
        url: file.path,
        publicId: file.filename,
        fileType: file.mimetype,
      }));
      project.requirementDocs.push(...newDocs);
    }

    await project.save();
    const populated = await populateProject(Project.findById(project._id));
    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── DELETE /api/projects/:id ──────────────────────────────────────────────────
exports.deleteProject = async (req, res) => {
  try {
    const project = await Project.findByIdAndDelete(req.params.id);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    // Delete all requirement docs from Cloudinary
    const deletePromises = project.requirementDocs.map((doc) => {
      const isImage = doc.fileType && doc.fileType.startsWith("image/");
      return cloudinary.uploader
        .destroy(doc.publicId, { resource_type: isImage ? "image" : "raw" })
        .catch(() => {});
    });
    await Promise.all(deletePromises);

    res.json({ message: "Project deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── DELETE /api/projects/:id/docs/:docId ──────────────────────────────────────
exports.deleteRequirementDoc = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    const doc = project.requirementDocs.id(req.params.docId);
    if (!doc) {
      return res.status(404).json({ message: "Document not found" });
    }

    // Remove from Cloudinary
    const isImage = doc.fileType && doc.fileType.startsWith("image/");
    await cloudinary.uploader
      .destroy(doc.publicId, { resource_type: isImage ? "image" : "raw" })
      .catch(() => {});

    doc.deleteOne();
    await project.save();

    res.json({ message: "Document deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── PUT /api/projects/:id/phases ──────────────────────────────────────────────
// Replace entire phases array
exports.updatePhases = async (req, res) => {
  try {
    const { phases } = req.body;
    if (!Array.isArray(phases)) {
      return res.status(400).json({ message: "phases must be an array" });
    }

    const project = await Project.findByIdAndUpdate(
      req.params.id,
      { $set: { phases } },
      { new: true, runValidators: true }
    );

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    const populated = await populateProject(Project.findById(project._id));
    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
