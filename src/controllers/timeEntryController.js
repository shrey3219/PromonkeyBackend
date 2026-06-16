const TimeEntry = require("../models/TimeEntry");
const Task = require("../models/Task");
const Phase = require("../models/Phase");
const Employee = require("../models/Employee");
const { getPaginationOptions, paginatedResponse } = require("../utils/paginate");

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

// ─── POST /api/time-entries 
exports.logTime = async (req, res) => {
  try {
    const { taskId, hoursLogged, date, note } = req.body;

    if (!taskId || !hoursLogged) {
      return res.status(400).json({ message: "taskId and hoursLogged are required" });
    }

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    const employee = await Employee.findOne({ user: req.user._id });
    if (!employee) {
      return res.status(404).json({ message: "Employee record not found for this user" });
    }

    if (req.user.role === "employee") {
      const isTaskAssigned = task.assignedTo?.toString() === employee._id.toString();
      const isPhaseAssigned = await Phase.findOne({ _id: task.phase, assignees: employee._id });
      if (!isTaskAssigned && !isPhaseAssigned) {
        return res.status(403).json({ message: "You can only log time on your assigned tasks." });
      }
    }

    const entryDate = date ? new Date(date) : new Date();
    const dayStart = new Date(entryDate.getFullYear(), entryDate.getMonth(), entryDate.getDate());
    const dayEnd   = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

    const existing = await TimeEntry.findOne({
      employee: employee._id,
      task: taskId,
      date: { $gte: dayStart, $lt: dayEnd },
    });
    if (existing) {
      return res.status(400).json({
        message: "You have already logged time for this task today",
      });
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

// ─── GET /api/time-entries
exports.getTimeEntries = async (req, res) => {
  try {
    const filter = {};
    if (req.query.task)     filter.task     = req.query.task;
    if (req.query.phase)    filter.phase    = req.query.phase;
    if (req.query.project)  filter.project  = req.query.project;
    if (req.query.employee) filter.employee = req.query.employee;

    if (req.user.role === "employee") {
      const employee = await Employee.findOne({ user: req.user._id });
      if (!employee) return res.json({ data: [], pagination: { total: 0, page: 1, limit: 10, totalPages: 0, hasNextPage: false, hasPrevPage: false } });
      filter.employee = employee._id;
    }

    const { page, limit } = getPaginationOptions(req.query);

    const result = await TimeEntry.paginate(filter, {
      page,
      limit,
      sort: { date: -1 },
      populate: [
        { path: "task",    select: "name status" },
        { path: "phase",   select: "name" },
        { path: "project", select: "name" },
        {
          path: "employee",
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

// ─── DELETE /api/time-entries/:id 
exports.deleteTimeEntry = async (req, res) => {
  try {
    const entry = await TimeEntry.findByIdAndDelete(req.params.id);
    if (!entry) {
      return res.status(404).json({ message: "Time entry not found" });
    }

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
