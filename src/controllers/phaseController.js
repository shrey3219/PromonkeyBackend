const Phase = require("../models/Phase");
const Project = require("../models/Project");
const Employee = require("../models/Employee");
const { getPaginationOptions, paginatedResponse } = require("../utils/paginate");

const populatePhase = (query) =>
  query.populate({
    path: "assignees",
    populate: [
      { path: "user", select: "name email profileImage" },
      { path: "role", select: "name" },
    ],
  });

// ─── POST /api/phases 
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

    const projectExists = await Project.findById(project);
    if (!projectExists) {
      return res.status(404).json({ message: "Project not found" });
    }

    // Ownership check: employee must be project creator or assignedEmployee to create phases
    if (req.user.role === "employee") {
      const empRecord = await Employee.findOne({ user: req.user._id });
      const isCreator = projectExists.createdBy.toString() === req.user._id.toString();
      const isMember  = empRecord && projectExists.assignedEmployees?.some(
        (e) => e.toString() === empRecord._id.toString()
      );
      if (!isCreator && !isMember) {
        return res.status(403).json({ message: "Access denied. You can only create phases in projects you created or are assigned to." });
      }
    }

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

// ─── GET /api/phases?project=:projectId
exports.getPhases = async (req, res) => {
  try {
    const filter = {};
    if (req.query.project) filter.project = req.query.project;

    if (req.user.role === "employee") {
      const empRecord = await Employee.findOne({ user: req.user._id });
      if (!empRecord) return res.json({ data: [], pagination: { total: 0, page: 1, limit: 10, totalPages: 0, hasNextPage: false, hasPrevPage: false } });

      const assignedFilter = { assignees: empRecord._id };
      if (filter.project) assignedFilter.project = filter.project;
      const assignedPhaseIds = (await Phase.find(assignedFilter, "_id")).map((p) => p._id.toString());

      const createdProjects = await Project.find({ createdBy: req.user._id }, "_id");
      const createdProjectIds = createdProjects.map((p) => p._id.toString());

      const memberProjects = await Project.find({ assignedEmployees: empRecord._id }, "_id");
      const memberProjectIds = memberProjects.map((p) => p._id.toString());

      const accessibleProjectIds = [...new Set([...createdProjectIds, ...memberProjectIds])];

      let accessiblePhaseIds = [];
      if (accessibleProjectIds.length > 0) {
        const accessFilter = { project: { $in: accessibleProjectIds } };
        if (filter.project) accessFilter.project = filter.project;
        accessiblePhaseIds = (await Phase.find(accessFilter, "_id")).map((p) => p._id.toString());
      }

      const allPhaseIds = [...new Set([...assignedPhaseIds, ...accessiblePhaseIds])];

      delete filter.assignees;
      filter._id = { $in: allPhaseIds };
    }

    const { page, limit } = getPaginationOptions(req.query);

    const result = await Phase.paginate(filter, {
      page,
      limit,
      sort: { order: 1, createdAt: 1 },
      populate: [
        {
          path: "assignees",
          populate: [
            { path: "user", select: "name email profileImage" },
            { path: "role", select: "name" },
          ],
        },
      ],
    });

    res.json(paginatedResponse(result));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── GET /api/phases/:id 
exports.getPhaseById = async (req, res) => {
  try {
    const phase = await populatePhase(Phase.findById(req.params.id));
    if (!phase) {
      return res.status(404).json({ message: "Phase not found" });
    }

    if (req.user.role === "employee") {
      const empRecord = await Employee.findOne({ user: req.user._id });
      if (!empRecord) return res.status(403).json({ message: "Access denied" });

      const isAssigned = phase.assignees.some(
        (a) => a._id.toString() === empRecord._id.toString()
      );

      const project = await Project.findById(phase.project);
      const isCreator = project && project.createdBy.toString() === req.user._id.toString();
      const isProjectMember = project && project.assignedEmployees?.some(
        (e) => e.toString() === empRecord._id.toString()
      );

      if (!isAssigned && !isCreator && !isProjectMember) {
        return res.status(403).json({ message: "Access denied" });
      }
    }

    res.json(phase);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── PUT /api/phases/:id 
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

    if (req.user.role === "employee") {
      const empRecord = await Employee.findOne({ user: req.user._id });
      const project = await Project.findById(phase.project);
      const isCreator = project && project.createdBy.toString() === req.user._id.toString();
      const isAssigned = empRecord && project && project.assignedEmployees?.some(
        (e) => e.toString() === empRecord._id.toString()
      );
      if (!isCreator && !isAssigned) {
        return res.status(403).json({ message: "Access denied. You can only update phases in projects you created or are assigned to." });
      }
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

// ─── DELETE /api/phases/:id
exports.deletePhase = async (req, res) => {
  try {
    const phase = await Phase.findById(req.params.id);
    if (!phase) {
      return res.status(404).json({ message: "Phase not found" });
    }

    if (req.user.role === "employee") {
      const empRecord = await Employee.findOne({ user: req.user._id });
      const project = await Project.findById(phase.project);
      const isCreator = project && project.createdBy.toString() === req.user._id.toString();
      const isAssigned = empRecord && project && project.assignedEmployees?.some(
        (e) => e.toString() === empRecord._id.toString()
      );
      if (!isCreator && !isAssigned) {
        return res.status(403).json({ message: "Access denied. You can only delete phases in projects you created or are assigned to." });
      }
    }

    await Phase.findByIdAndDelete(req.params.id);
    res.json({ message: "Phase deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getPhaseMembers = async (req, res) => {
  try {
    const phase = await Phase.findById(req.params.id).populate({
      path: "assignees",
      populate: { path: "user", select: "name email profileImage role" },
    });
    if (!phase) {
      return res.status(404).json({ message: "Phase not found" });
    }

    const project = await Project.findById(phase.project)
      .populate("createdBy", "name email profileImage role");

    if (req.user.role === "employee") {
      const empRecord = await Employee.findOne({ user: req.user._id });
      if (!empRecord) return res.status(403).json({ message: "Access denied" });
      const isCreator  = project && project.createdBy._id.toString() === req.user._id.toString();
      const isMember   = project && project.assignedEmployees?.some((e) => e.toString() === empRecord._id.toString());
      const isAssigned = phase.assignees?.some((a) => a._id?.toString() === empRecord._id.toString());
      if (!isCreator && !isMember && !isAssigned) {
        return res.status(403).json({ message: "Access denied" });
      }
    }

    const members = [];

    if (project && project.createdBy._id.toString() !== req.user._id.toString()) {
      members.push(project.createdBy);
    }

    for (const emp of (phase.assignees || [])) {
      if (emp.user && emp.user._id.toString() !== req.user._id.toString()) {
        members.push(emp.user);
      }
    }

    const seen = new Set();
    const unique = members.filter((m) => {
      const id = m._id.toString();
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });

    res.json(unique);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── GET /api/phases/:id/employees
exports.getPhaseEmployees = async (req, res) => {
  try {
    const phase = await populatePhase(Phase.findById(req.params.id));
    if (!phase) {
      return res.status(404).json({ message: "Phase not found" });
    }

    if (req.user.role === "employee") {
      const empRecord = await Employee.findOne({ user: req.user._id });
      if (!empRecord) return res.status(403).json({ message: "Access denied" });
      const project = await Project.findById(phase.project);
      const isCreator  = project && project.createdBy.toString() === req.user._id.toString();
      const isMember   = project && project.assignedEmployees?.some((e) => e.toString() === empRecord._id.toString());
      const isAssigned = phase.assignees?.some((a) => a._id?.toString() === empRecord._id.toString());
      if (!isCreator && !isMember && !isAssigned) {
        return res.status(403).json({ message: "Access denied" });
      }
    }

    res.json(phase.assignees || []);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
