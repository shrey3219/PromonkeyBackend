const Phase = require("../models/Phase");
const Project = require("../models/Project");
const Employee = require("../models/Employee");

// Helper — populate assignees with user info + role
const populatePhase = (query) =>
  query.populate({
    path: "assignees",
    populate: [
      { path: "user", select: "name email profileImage" },
      { path: "role", select: "name" },
    ],
  });

// ─── POST /api/phases ──────────────────────────────────────────────────────────
exports.createPhase = async (req, res) => {
  try {
    const {
      project,
      name,
      description,
      order,
      estimatedDuration,
      estimatedEndDate,
      actualStart,
      status,
      assignees,
    } = req.body;

    if (!project || !name) {
      return res.status(400).json({ message: "project and name are required" });
    }

    // Validate project exists
    const projectExists = await Project.findById(project);
    if (!projectExists) {
      return res.status(404).json({ message: "Project not found" });
    }

    // Validate all assignee employee IDs exist
    if (assignees && assignees.length > 0) {
      const count = await Employee.countDocuments({ _id: { $in: assignees } });
      if (count !== assignees.length) {
        return res.status(400).json({ message: "One or more employees not found" });
      }
    }

    const phase = await Phase.create({
      project,
      name,
      description,
      order,
      estimatedDuration,
      estimatedEndDate,
      actualStart,
      status,
      assignees: assignees || [],
    });

    const populated = await populatePhase(Phase.findById(phase._id));
    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── GET /api/phases?project=:projectId ───────────────────────────────────────
exports.getPhases = async (req, res) => {
  try {
    const filter = {};
    if (req.query.project) filter.project = req.query.project;

    const phases = await populatePhase(
      Phase.find(filter).sort({ order: 1, createdAt: 1 })
    );

    res.json(phases);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── GET /api/phases/:id ───────────────────────────────────────────────────────
exports.getPhaseById = async (req, res) => {
  try {
    const phase = await populatePhase(Phase.findById(req.params.id));
    if (!phase) {
      return res.status(404).json({ message: "Phase not found" });
    }
    res.json(phase);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── PUT /api/phases/:id ───────────────────────────────────────────────────────
exports.updatePhase = async (req, res) => {
  try {
    const {
      name,
      description,
      order,
      estimatedDuration,
      estimatedEndDate,
      actualStart,
      actualEnd,
      status,
      assignees,
    } = req.body;

    const phase = await Phase.findById(req.params.id);
    if (!phase) {
      return res.status(404).json({ message: "Phase not found" });
    }

    if (name !== undefined) phase.name = name;
    if (description !== undefined) phase.description = description;
    if (order !== undefined) phase.order = order;
    if (estimatedDuration !== undefined) phase.estimatedDuration = estimatedDuration;
    if (estimatedEndDate !== undefined) phase.estimatedEndDate = estimatedEndDate;
    if (actualStart !== undefined) phase.actualStart = actualStart;
    if (actualEnd !== undefined) phase.actualEnd = actualEnd;
    if (status !== undefined) phase.status = status;

    if (assignees !== undefined) {
      if (assignees.length > 0) {
        const count = await Employee.countDocuments({ _id: { $in: assignees } });
        if (count !== assignees.length) {
          return res.status(400).json({ message: "One or more employees not found" });
        }
      }
      phase.assignees = assignees;
    }

    await phase.save();
    const populated = await populatePhase(Phase.findById(phase._id));
    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── DELETE /api/phases/:id ────────────────────────────────────────────────────
exports.deletePhase = async (req, res) => {
  try {
    const phase = await Phase.findByIdAndDelete(req.params.id);
    if (!phase) {
      return res.status(404).json({ message: "Phase not found" });
    }
    res.json({ message: "Phase deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
