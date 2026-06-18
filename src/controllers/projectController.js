const Project = require("../models/Project");
const Phase = require("../models/Phase");
const Task = require("../models/Task");
const Client = require("../models/Client");
const User = require("../models/User");
const { cloudinary } = require("../config/cloudinary");
const { getPaginationOptions, paginatedResponse } = require("../utils/paginate");

const populateProject = (query) =>
  query
    .populate({
      path: "client",
      select: "companyName",
      populate: { path: "user", select: "name email phone profileImage" },
    })
    .populate("createdBy", "name email")
    .populate({
      path: "assignedEmployees",
      populate: { path: "user", select: "name email profileImage" },
    });

// Calculate progress from phases
const calcProgress = async (projectId) => {
  const phases = await Phase.find({ project: projectId }, "status");
  const total = phases.length;
  const completed = phases.filter((p) => p.status === "completed").length;
  return {
    progressPercent: total > 0 ? Math.round((completed / total) * 100) : 0,
    totalPhases: total,
    completedPhases: completed,
  };
};

const getProjectWithPhases = async (projectDoc, employeeId = null, showAllPhases = false) => {
  let phaseQuery = Phase.find({ project: projectDoc._id });
  if (employeeId && !showAllPhases) {
    phaseQuery = Phase.find({ project: projectDoc._id, assignees: employeeId });
  }

  const phases = await phaseQuery
    .sort({ order: 1 })
    .populate({
      path: "assignees",
      populate: [
        { path: "user", select: "name email profileImage" },
        { path: "role", select: "name" },
      ],
    });

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

  const progress = await calcProgress(projectDoc._id);

  return { ...projectDoc.toObject(), ...progress, phases: phasesWithProgress };
};

// ─── POST /api/projects 
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
      assignedEmployees,
      phases, 
    } = req.body;

    if (!name || !client || !startDate || !estimatedEndDate) {
      return res.status(400).json({
        message: "name, client, startDate, and estimatedEndDate are required",
      });
    }

    const clientExists = await Client.findById(client);
    if (!clientExists) {
      return res.status(404).json({ message: "Client not found" });
    }

    const requirementDocs = (req.files || []).map((file) => ({
      name: file.originalname,
      url: file.path,
      publicId: file.filename,
      fileType: file.mimetype,
    }));

    let parsedAssignedEmployees = assignedEmployees;
    if (typeof assignedEmployees === "string") {
      try { parsedAssignedEmployees = JSON.parse(assignedEmployees); } catch { parsedAssignedEmployees = []; }
    }

    const project = await Project.create({
      name,
      description,
      client,
      startDate,
      estimatedEndDate,
      status,
      priority,
      assignedEmployees: Array.isArray(parsedAssignedEmployees) ? parsedAssignedEmployees : [],
      requirementDocs,
      createdBy: req.user._id,
    });

    let parsedPhases = phases;
    if (typeof phases === "string") {
      try {
        parsedPhases = JSON.parse(phases);
      } catch {
        return res.status(400).json({ message: "Invalid phases format" });
      }
    }

  
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

// ─── GET /api/projects
exports.getProjects = async (req, res) => {
  try {
    const filter = {};
    let employeeId = null;
    const { page, limit } = getPaginationOptions(req.query);

    if (req.user.role === "client") {
      const clientRecord = await Client.findOne({ user: req.user._id });
      if (!clientRecord) return res.json({ data: [], pagination: { total: 0, page, limit, totalPages: 0, hasNextPage: false, hasPrevPage: false } });
      filter.client = clientRecord._id;
    }

    if (req.user.role === "employee") {
      const empRecord = await require("../models/Employee").findOne({ user: req.user._id });
      if (!empRecord) return res.json({ data: [], pagination: { total: 0, page, limit, totalPages: 0, hasNextPage: false, hasPrevPage: false } });
      employeeId = empRecord._id;
      const assignedPhases = await Phase.find({ assignees: empRecord._id }, "project");
      const phaseProjectIds = assignedPhases.map((p) => p.project.toString());
      const directProjects = await Project.find({ assignedEmployees: empRecord._id }, "_id");
      const directProjectIds = directProjects.map((p) => p._id.toString());
      const createdProjects = await Project.find({ createdBy: req.user._id }, "_id");
      const createdProjectIds = createdProjects.map((p) => p._id.toString());
      const projectIds = [...new Set([...phaseProjectIds, ...directProjectIds, ...createdProjectIds])];
      filter._id = { $in: projectIds };
    }
    if (req.query.status) filter.status = req.query.status;
    if (req.query.priority) filter.priority = req.query.priority;
    if (req.query.client && req.user.role !== "client" && req.user.role !== "employee") {
      filter.client = req.query.client;
    }

    const result = await Project.paginate(filter, {
      page,
      limit,
      sort: { createdAt: -1 },
      populate: [
        {
          path: "client",
          select: "companyName",
          populate: { path: "user", select: "name email phone profileImage" },
        },
        { path: "createdBy", select: "name email" },
        {
          path: "assignedEmployees",
          populate: { path: "user", select: "name email profileImage" },
        },
      ],
    });

    const docsWithPhases = await Promise.all(
      result.docs.map((p) => {
        if (req.user.role === "employee") {
          const isCreator = p.createdBy?._id?.toString() === req.user._id.toString();
          const isProjectMember = p.assignedEmployees?.some(
            (e) => e._id?.toString() === employeeId?.toString()
          );
          if (isCreator || isProjectMember) {
            return getProjectWithPhases(p, null); 
          }
          return getProjectWithPhases(p, employeeId); 
        }
        return getProjectWithPhases(p);
      })
    );

    res.json({
      data: docsWithPhases,
      pagination: {
        total:       result.totalDocs,
        page:        result.page,
        limit:       result.limit,
        totalPages:  result.totalPages,
        hasNextPage: result.hasNextPage,
        hasPrevPage: result.hasPrevPage,
        nextPage:    result.nextPage,
        prevPage:    result.prevPage,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── GET /api/projects/:id 
exports.getProjectById = async (req, res) => {
  try {
    const project = await populateProject(Project.findById(req.params.id));
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    let employeeId = null;

    if (req.user.role === "client") {
      const clientRecord = await Client.findOne({ user: req.user._id });
      if (!clientRecord || project.client._id.toString() !== clientRecord._id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }
    }

    if (req.user.role === "employee") {
      const empRecord = await require("../models/Employee").findOne({ user: req.user._id });
      if (!empRecord) return res.status(403).json({ message: "Access denied" });
      const isDirectlyAssigned = project.assignedEmployees?.some(
        (e) => e._id?.toString() === empRecord._id.toString()
      );
      const assignedPhase = await Phase.findOne({ project: project._id, assignees: empRecord._id });
      const isCreator = project.createdBy._id?.toString() === req.user._id.toString();
      if (!isDirectlyAssigned && !assignedPhase && !isCreator) {
        return res.status(403).json({ message: "Access denied" });
      }
      employeeId = empRecord._id;

      const showAllPhases = isCreator || isDirectlyAssigned;
      const result = await getProjectWithPhases(project, showAllPhases ? null : employeeId);
      return res.json(result);
    }

    const result = await getProjectWithPhases(project, employeeId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── PUT /api/projects/:id 
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
      assignedEmployees,
      phases,
    } = req.body;

    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    if (req.user.role === "employee") {
      const empRecord = await require("../models/Employee").findOne({ user: req.user._id });
      const isCreator = project.createdBy.toString() === req.user._id.toString();
      const isAssigned = empRecord && project.assignedEmployees?.some(
        (e) => e.toString() === empRecord._id.toString()
      );
      if (!isCreator && !isAssigned) {
        return res.status(403).json({ message: "Access denied. You can only update projects you created or are assigned to." });
      }
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

    if (assignedEmployees !== undefined) {
      let parsedAssignedEmployees = assignedEmployees;
      if (typeof assignedEmployees === "string") {
        try { parsedAssignedEmployees = JSON.parse(assignedEmployees); } catch { parsedAssignedEmployees = []; }
      }
      project.assignedEmployees = Array.isArray(parsedAssignedEmployees) ? parsedAssignedEmployees : [];
    }

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


    let parsedPhases = phases;
    if (typeof phases === "string") {
      try { parsedPhases = JSON.parse(phases); } catch {
        return res.status(400).json({ message: "Invalid phases format" });
      }
    }

    if (parsedPhases && Array.isArray(parsedPhases) && parsedPhases.length > 0) {
      await Promise.all(
        parsedPhases.map(async (p, index) => {
          if (p._id) {
            const updateFields = {};
            if (p.name !== undefined)              updateFields.name = p.name;
            if (p.description !== undefined)       updateFields.description = p.description;
            if (p.order !== undefined)             updateFields.order = p.order;
            if (p.estimatedDuration !== undefined) updateFields.estimatedDuration = p.estimatedDuration;
            if (p.estimatedEndDate !== undefined)  updateFields.estimatedEndDate = p.estimatedEndDate;
            if (p.actualStart !== undefined)       updateFields.actualStart = p.actualStart;
            if (p.actualEnd !== undefined)         updateFields.actualEnd = p.actualEnd;
            if (p.status !== undefined)            updateFields.status = p.status;
            if (p.assignees !== undefined)         updateFields.assignees = p.assignees;

            await Phase.findByIdAndUpdate(p._id, { $set: updateFields });
          } else {
            await Phase.create({
              project: project._id,
              name: p.name,
              description: p.description,
              order: p.order ?? index + 1,
              estimatedDuration: p.estimatedDuration ?? 0,
              estimatedEndDate: p.estimatedEndDate,
              actualStart: p.actualStart,
              status: p.status ?? "not_started",
              assignees: p.assignees ?? [],
            });
          }
        })
      );
    }

    const populated = await populateProject(Project.findById(project._id));
    const result = await getProjectWithPhases(populated);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── GET /api/projects/:id/employees
exports.getProjectEmployees = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate({
        path: "assignedEmployees",
        populate: [
          { path: "user", select: "name email profileImage" },
          { path: "role", select: "name" },
        ],
      });

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

  
    if (req.user.role === "employee") {
      const empRecord = await require("../models/Employee").findOne({ user: req.user._id });
      if (!empRecord) return res.status(403).json({ message: "Access denied" });
      const isCreator  = project.createdBy._id?.toString() === req.user._id.toString();
      const isMember   = project.assignedEmployees?.some((e) => e._id?.toString() === empRecord._id.toString());
      const hasPhase   = await Phase.findOne({ project: project._id, assignees: empRecord._id });
      if (!isCreator && !isMember && !hasPhase) {
        return res.status(403).json({ message: "Access denied" });
      }
    }

    res.json(project.assignedEmployees || []);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getProjectMembers = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate("createdBy", "name email profileImage role")
      .populate({
        path: "assignedEmployees",
        populate: { path: "user", select: "name email profileImage role" },
      });

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }


    if (req.user.role === "employee") {
      const empRecord = await require("../models/Employee").findOne({ user: req.user._id });
      if (!empRecord) return res.status(403).json({ message: "Access denied" });
      const isCreator = project.createdBy._id?.toString() === req.user._id.toString();
      const isMember  = project.assignedEmployees?.some((e) => e._id?.toString() === empRecord._id.toString());
      const hasPhase  = await Phase.findOne({ project: project._id, assignees: empRecord._id });
      if (!isCreator && !isMember && !hasPhase) {
        return res.status(403).json({ message: "Access denied" });
      }
    }

    const members = [];

    if (project.createdBy._id.toString() !== req.user._id.toString()) {
      members.push(project.createdBy);
    }

    for (const emp of project.assignedEmployees || []) {
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

// ─── DELETE /api/projects/:id
exports.deleteProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    if (req.user.role === "employee") {
      const isCreator = project.createdBy.toString() === req.user._id.toString();
      if (!isCreator) {
        return res.status(403).json({ message: "Access denied. Only the project creator can delete this project." });
      }
    }

    await Project.findByIdAndDelete(req.params.id);

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

// ─── DELETE /api/projects/:id/docs/:docId
exports.deleteRequirementDoc = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    if (req.user.role === "employee") {
      const empRecord = await require("../models/Employee").findOne({ user: req.user._id });
      const isCreator = project.createdBy.toString() === req.user._id.toString();
      const isAssigned = empRecord && project.assignedEmployees?.some(
        (e) => e.toString() === empRecord._id.toString()
      );
      if (!isCreator && !isAssigned) {
        return res.status(403).json({ message: "Access denied. You can only modify projects you created or are assigned to." });
      }
    }

    const doc = project.requirementDocs.id(req.params.docId);
    if (!doc) {
      return res.status(404).json({ message: "Document not found" });
    }


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

