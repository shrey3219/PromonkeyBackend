const TimeEntry = require("../models/TimeEntry");
const Task = require("../models/Task");
const Phase = require("../models/Phase");
const Employee = require("../models/Employee");

// Helper — populate time entry refs
const populateEntry = (query) =>
  query
    .populate("task", "name status")
    .populate("phase", "name")
    .populate("project", "name")
    .populate({
      path: "employee",
      populate: [
        { path: "user", select: "name email profileImage" },
        { path: "role", select: "name" },
      ],
    });

// ─── POST /api/time-entries ────────────────────────────────────────────────────
// Employee logs time on a task
exports.logTime = async (req, res) => {
  try {
    const { taskId, hoursLogged, date, note } = req.body;

    if (!taskId || !hoursLogged) {
      return res.status(400).json({ message: "taskId and hoursLogged are required" });
    }

    // Get task to pull phase + project refs
    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Get employee record from logged-in user
    const employee = await Employee.findOne({ user: req.user._id });
    if (!employee) {
      return res.status(404).json({ message: "Employee record not found for this user" });
    }

    const entry = await TimeEntry.create({
      task: taskId,
      phase: task.phase,
      project: task.project,
      employee: employee._id,
      hoursLogged,
      date: date || Date.now(),
      note,
    });

    // Update actualHoursLogged on the task
    const totalHours = await TimeEntry.aggregate([
      { $match: { task: task._id } },
      { $group: { _id: null, total: { $sum: "$hoursLogged" } } },
    ]);
    task.actualHoursLogged = totalHours[0]?.total || 0;
    await task.save();

    const populated = await populateEntry(TimeEntry.findById(entry._id));
    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── GET /api/time-entries ─────────────────────────────────────────────────────
// Query by task, phase, project, or employee
exports.getTimeEntries = async (req, res) => {
  try {
    const filter = {};
    if (req.query.task) filter.task = req.query.task;
    if (req.query.phase) filter.phase = req.query.phase;
    if (req.query.project) filter.project = req.query.project;
    if (req.query.employee) filter.employee = req.query.employee;

    const entries = await populateEntry(
      TimeEntry.find(filter).sort({ date: -1 })
    );
    res.json(entries);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── DELETE /api/time-entries/:id ─────────────────────────────────────────────
exports.deleteTimeEntry = async (req, res) => {
  try {
    const entry = await TimeEntry.findByIdAndDelete(req.params.id);
    if (!entry) {
      return res.status(404).json({ message: "Time entry not found" });
    }

    // Recalculate actualHoursLogged on the task
    const task = await Task.findById(entry.task);
    if (task) {
      const totalHours = await TimeEntry.aggregate([
        { $match: { task: task._id } },
        { $group: { _id: null, total: { $sum: "$hoursLogged" } } },
      ]);
      task.actualHoursLogged = totalHours[0]?.total || 0;
      await task.save();
    }

    res.json({ message: "Time entry deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
