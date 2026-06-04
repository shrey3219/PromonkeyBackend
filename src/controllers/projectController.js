const Project = require("../models/Project");
const Phase = require("../models/Phase");
const Task = require("../models/Task");
const Client = require("../models/Client");
const { cloudinary } = require("../config/cloudinary");

// ─── Helper ────────────────────────────────────────────────────────────────────
const populateProject = (query) =>
  query
    .populate("client", "clientName companyName email phone profileImage")
    .populate("createdBy", "name email");

// Calculate progress from tasks
const calcProgress = async (projectId) => {
  const tasks = await Task.find({ project: projectId }, "status");
  const total = tasks.length;
  const completed = tasks.filter((t) => t.status === "completed").length;
  return {
    progressPercent: total > 0 ? Math.round((completed / total) * 100) : 0,
    totalTasks: total,
    completedTasks: completed,
  };
};

// Fetch phases for a project with assignees populated + per-phase progress
const getProjectWithPhases = async (projectDoc) => {
  const phases = await Phase.find({ project: projectDoc._id })
    .sort({ order: 1 })
    .populate({
      path: "assignees",
      populate: [
        { path: "user", select: "name email profileImage" },
        { path: "role", select: "name" },
      ],
    });

  // Add progressPercent to each phase
  const phasesWithProgress = await Promise.all(
    phases.map(async (phase) => {
      const tasks = await Task.find({ phase: phase._id }, "status");
      const total = tasks.length;
      const completed = tasks.filter((t) => t.status === "completed").length;
      const progressPercent = total > 0 ? Math.round((completed / total) * 100) : 0;
      return {
        ...phase.toObject(),
        progressPercent,
        taskSummary: {
          total,
          completed,
          inProgress: tasks.filter((t) => t.status === "in_progress").length,
          notStarted: tasks.filter((t) => t.status === "not_started").length,
        },
      };
    })
  );

  // Project-level progress
  const progress = await calcProgress(projectDoc._id);

  return { ...projectDoc.toObject(), ...progress, phases: phasesWithProgress };
};

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
      phases, // optional array of phase objects
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
      requirementDocs,
      createdBy: req.user._id,
    });

    // Parse phases — string agar FormData se aaya ho (multipart), array agar JSON se
    let parsedPhases = phases;
    if (typeof phases === "string") {
      try {
        parsedPhases = JSON.parse(phases);
      } catch {
        return res.status(400).json({ message: "Invalid phases format" });
      }
    }

    // If phases passed along with project creation, create them too
    if (parsedPhases && Array.isArray(parsedPhases) && parsedPhases.length > 0) {
      const phaseDocs = parsedPhases.map((p, index) => ({
        project: project._id,
        name: p.name,
        description: p.description,
        order: p.order ?? index + 1,
        estimatedDuration: p.estimatedDuration ?? 0,
        estimatedEndDate: p.estimatedEndDate,
        actualStart: p.actualStart,
        status: p.status ?? "not_started",
        assignees: p.assignees ?? [],
      }));
      await Phase.insertMany(phaseDocs);
    }

    const populated = await populateProject(Project.findById(project._id));
    const result = await getProjectWithPhases(populated);
    res.status(201).json(result);
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

    // Attach phases to each project
    const result = await Promise.all(projects.map(getProjectWithPhases));
    res.json(result);
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

    // Attach phases with assignees
    const result = await getProjectWithPhases(project);
    res.json(result);
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
    const result = await getProjectWithPhases(populated);
    res.json(result);
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

// Phases are now a separate collection — use /api/phases routes instead
