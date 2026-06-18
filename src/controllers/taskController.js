const Task = require("../models/Task");
const Phase = require("../models/Phase");
const Employee = require("../models/Employee");
const Project = require("../models/Project");
const { getPaginationOptions, paginatedResponse } = require("../utils/paginate");

const populateTask = (query) =>
  query
    .populate("phase", "name status")
    .populate("project", "name")
    .populate({
      path: "assignedTo",
      populate: [
        { path: "user", select: "name email profileImage" },
        { path: "role", select: "name" },
      ],
    });

// ─── POST /api/tasks
exports.createTask = async (req, res) => {
  try {
    const {
      phase,
      name,
      description,
      assignedTo,
      estimatedHours,
      dueDate,
      status,
    } = req.body;

    if (!phase || !name) {
      return res.status(400).json({ message: "phase and name are required" });
    }

    const phaseDoc = await Phase.findById(phase);
    if (!phaseDoc) {
      return res.status(404).json({ message: "Phase not found" });
    }

    if (req.user.role === "employee") {
      const empRecord = await Employee.findOne({ user: req.user._id });
      const projectDoc = await Project.findById(phaseDoc.project);
      const isCreator = projectDoc && projectDoc.createdBy.toString() === req.user._id.toString();
      const isMember  = empRecord && projectDoc && projectDoc.assignedEmployees?.some(
        (e) => e.toString() === empRecord._id.toString()
      );
      if (!isCreator && !isMember) {
        return res.status(403).json({ message: "Access denied. You can only create tasks in projects you created or are assigned to." });
      }
    }

    if (assignedTo) {
      const empExists = await Employee.findById(assignedTo);
      if (!empExists) {
        return res.status(404).json({ message: "Employee not found" });
      }
    }

    const task = await Task.create({
      phase,
      project: phaseDoc.project,
      name,
      description,
      assignedTo,
      estimatedHours,
      dueDate,
      status,
    });

    const populated = await populateTask(Task.findById(task._id));
    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── GET /api/tasks?phase=:phaseId&project=:projectId&assignedTo=:empId
exports.getTasks = async (req, res) => {
  try {
    const filter = {};
    if (req.query.phase)      filter.phase      = req.query.phase;
    if (req.query.project)    filter.project    = req.query.project;
    if (req.query.assignedTo) filter.assignedTo = req.query.assignedTo;
    if (req.query.status)     filter.status     = req.query.status;

    if (req.user.role === "employee") {
      const empRecord = await Employee.findOne({ user: req.user._id });
      if (!empRecord) return res.json({ data: [], pagination: { total: 0, page: 1, limit: 10, totalPages: 0, hasNextPage: false, hasPrevPage: false } });

      const accessibleProjects = await Project.find({
        $or: [
          { createdBy: req.user._id },
          { assignedEmployees: empRecord._id },
        ],
      }, "_id");
      const accessibleProjectIds = accessibleProjects.map((p) => p._id.toString());

      if (accessibleProjectIds.length > 0) {
        const requestedProject = req.query.project;
        if (requestedProject && accessibleProjectIds.includes(requestedProject)) {
        } else {
          const projectTaskIds = (
            await Task.find({ project: { $in: accessibleProjectIds } }, "_id")
          ).map((t) => t._id.toString());

          const assignedTaskIds = (
            await Task.find({ ...filter, assignedTo: empRecord._id }, "_id")
          ).map((t) => t._id.toString());

          const phaseAssigned = await Phase.find({ assignees: empRecord._id }, "_id");
          const phaseTaskIds = (
            await Task.find({ phase: { $in: phaseAssigned.map((p) => p._id) }, ...( filter.project ? { project: filter.project } : {}) }, "_id")
          ).map((t) => t._id.toString());

          const allTaskIds = [...new Set([...projectTaskIds, ...assignedTaskIds, ...phaseTaskIds])];

          delete filter.assignedTo;
          filter._id = { $in: allTaskIds };
        }
      } else {
        const phaseAssigned = await Phase.find({ assignees: empRecord._id }, "_id");
        const phaseTaskIds  = (
          await Task.find({ phase: { $in: phaseAssigned.map((p) => p._id) } }, "_id")
        ).map((t) => t._id.toString());

        const directTaskIds = (
          await Task.find({ assignedTo: empRecord._id }, "_id")
        ).map((t) => t._id.toString());

        const allTaskIds = [...new Set([...phaseTaskIds, ...directTaskIds])];
        delete filter.assignedTo;
        filter._id = { $in: allTaskIds };
      }
    }

    const { page, limit } = getPaginationOptions(req.query);

    const result = await Task.paginate(filter, {
      page,
      limit,
      sort: { createdAt: 1 },
      populate: [
        { path: "phase",    select: "name status" },
        { path: "project",  select: "name" },
        {
          path: "assignedTo",
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

// ─── GET /api/tasks/:id 
exports.getTaskById = async (req, res) => {
  try {
    const task = await populateTask(Task.findById(req.params.id));
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    if (req.user.role === "employee") {
      const empRecord = await Employee.findOne({ user: req.user._id });
      if (!empRecord) return res.status(403).json({ message: "Access denied" });

      const isAssigned =
        task.assignedTo && task.assignedTo._id.toString() === empRecord._id.toString();

      const project = await Project.findById(task.project);
      const isCreator = project && project.createdBy.toString() === req.user._id.toString();
      const isProjectMember = project && project.assignedEmployees?.some(
        (e) => e.toString() === empRecord._id.toString()
      );

      if (!isAssigned && !isCreator && !isProjectMember) {
        return res.status(403).json({ message: "Access denied" });
      }
    }

    res.json(task);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── PUT /api/tasks/:id 
exports.updateTask = async (req, res) => {
  try {
    const {
      name,
      description,
      assignedTo,
      estimatedHours,
      dueDate,
      status,
    } = req.body;

    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    if (req.user.role === "employee") {
      const empRecord = await Employee.findOne({ user: req.user._id });
      const project = await Project.findById(task.project);
      const isProjectCreator = project && project.createdBy.toString() === req.user._id.toString();
      const isProjectMember = empRecord && project && project.assignedEmployees?.some(
        (e) => e.toString() === empRecord._id.toString()
      );
      const isTaskAssignee = empRecord && task.assignedTo?.toString() === empRecord._id.toString();
      if (!isProjectCreator && !isProjectMember && !isTaskAssignee) {
        return res.status(403).json({ message: "Access denied. You can only update tasks in your projects or assigned to you." });
      }
    }

    if (assignedTo !== undefined) {
      if (assignedTo) {
        const empExists = await Employee.findById(assignedTo);
        if (!empExists) {
          return res.status(404).json({ message: "Employee not found" });
        }
      }
      task.assignedTo = assignedTo;
    }

    if (name !== undefined) task.name = name;
    if (description !== undefined) task.description = description;
    if (estimatedHours !== undefined) task.estimatedHours = estimatedHours;
    if (dueDate !== undefined) task.dueDate = dueDate;
    if (status !== undefined) task.status = status;

    await task.save();
    const populated = await populateTask(Task.findById(task._id));
    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── DELETE /api/tasks/:id 
exports.deleteTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    if (req.user.role === "employee") {
      const empRecord = await Employee.findOne({ user: req.user._id });
      const project = await Project.findById(task.project);
      const isProjectCreator = project && project.createdBy.toString() === req.user._id.toString();
      const isProjectMember = empRecord && project && project.assignedEmployees?.some(
        (e) => e.toString() === empRecord._id.toString()
      );
      if (!isProjectCreator && !isProjectMember) {
        return res.status(403).json({ message: "Access denied. You can only delete tasks in projects you created or are assigned to." });
      }
    }

    await Task.findByIdAndDelete(req.params.id);
    res.json({ message: "Task deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getTaskMembers = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    if (req.user.role === "employee") {
      const empRecord = await Employee.findOne({ user: req.user._id });
      if (!empRecord) return res.status(403).json({ message: "Access denied" });
      const project = await Project.findById(task.project);
      const isCreator     = project && project.createdBy.toString() === req.user._id.toString();
      const isMember      = project && project.assignedEmployees?.some((e) => e.toString() === empRecord._id.toString());
      const isTaskAssign  = task.assignedTo?.toString() === empRecord._id.toString();
      const hasPhase      = await Phase.findOne({ _id: task.phase, assignees: empRecord._id });
      if (!isCreator && !isMember && !isTaskAssign && !hasPhase) {
        return res.status(403).json({ message: "Access denied" });
      }
    }

    const phase = await Phase.findById(task.phase).populate({
      path: "assignees",
      populate: { path: "user", select: "name email profileImage role" },
    });

    const project = await Project.findById(task.project)
      .populate("createdBy", "name email profileImage role");

    const members = [];

    if (project && project.createdBy._id.toString() !== req.user._id.toString()) {
      members.push(project.createdBy);
    }

    if (task.assignedTo) {
      const emp = await Employee.findById(task.assignedTo).populate("user", "name email profileImage role");
      if (emp && emp.user && emp.user._id.toString() !== req.user._id.toString()) {
        members.push(emp.user);
      }
    }

    for (const emp of (phase?.assignees || [])) {
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
