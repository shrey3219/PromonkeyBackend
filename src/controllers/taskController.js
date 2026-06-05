const Task = require("../models/Task");
const Phase = require("../models/Phase");
const Employee = require("../models/Employee");
const Project = require("../models/Project");

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
    if (req.query.phase) filter.phase = req.query.phase;
    if (req.query.project) filter.project = req.query.project;
    if (req.query.assignedTo) filter.assignedTo = req.query.assignedTo;
    if (req.query.status) filter.status = req.query.status;

    if (req.user.role === "employee") {
      const empRecord = await Employee.findOne({ user: req.user._id });
      if (!empRecord) return res.json([]);
      filter.assignedTo = empRecord._id;
    }

    const tasks = await populateTask(Task.find(filter).sort({ createdAt: 1 }));
    res.json(tasks);
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
      if (!empRecord || !task.assignedTo || task.assignedTo._id.toString() !== empRecord._id.toString()) {
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
    const task = await Task.findByIdAndDelete(req.params.id);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }
    res.json({ message: "Task deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
