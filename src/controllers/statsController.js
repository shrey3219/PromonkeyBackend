const Project = require("../models/Project");
const Phase = require("../models/Phase");
const Task = require("../models/Task");
const TimeEntry = require("../models/TimeEntry");
const Client = require("../models/Client");

const getWorkingDays = (startDate, endDate) => {
  let count = 0;
  const current = new Date(startDate);
  const end = new Date(endDate);
  while (current <= end) {
    const day = current.getDay();
    if (day !== 0 && day !== 6) count++; 
    current.setDate(current.getDate() + 1);
  }
  return count;
};

exports.getProjectStats = async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId)
      .populate("client", "clientName companyName");

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    if (req.user.role === "client") {
      const clientRecord = await Client.findOne({ user: req.user._id });
      if (!clientRecord || project.client._id.toString() !== clientRecord._id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }
    }

    const today = new Date();

    const phases = await Phase.find({ project: project._id }).sort({ order: 1 });

    const phaseStats = await Promise.all(
      phases.map(async (phase) => {
        const timeAgg = await TimeEntry.aggregate([
          { $match: { phase: phase._id } },
          { $group: { _id: null, totalHours: { $sum: "$hoursLogged" } } },
        ]);
        const actualHours = timeAgg[0]?.totalHours || 0;

        const isDelayed = actualHours > phase.estimatedDuration;
        const hoursOverrun = isDelayed ? actualHours - phase.estimatedDuration : 0;

        const isAtRisk =
          phase.estimatedEndDate &&
          today > new Date(phase.estimatedEndDate) &&
          phase.status !== "completed";

        const tasks = await Task.find({ phase: phase._id });
        const completedCount = tasks.filter((t) => t.status === "completed").length;
        const totalCount = tasks.length;

        const phaseProgress = totalCount > 0
          ? Math.round((completedCount / totalCount) * 100)
          : 0;

        const taskSummary = {
          total: totalCount,
          completed: completedCount,
          inProgress: tasks.filter((t) => t.status === "in_progress").length,
          notStarted: tasks.filter((t) => t.status === "not_started").length,
          progressPercent: phaseProgress,
        };

        return {
          _id: phase._id,
          name: phase.name,
          order: phase.order,
          status: phase.status,
          estimatedDuration: phase.estimatedDuration,
          actualHoursLogged: actualHours,
          hoursOverrun,
          isDelayed,
          isAtRisk,
          progressPercent: phaseProgress,
          estimatedEndDate: phase.estimatedEndDate,
          actualStart: phase.actualStart,
          actualEnd: phase.actualEnd,
          taskSummary,
        };
      })
    );

    const hasDelayedPhase = phaseStats.some((p) => p.isDelayed);
    const hasAtRiskPhase = phaseStats.some((p) => p.isAtRisk);
    const projectAtRisk = hasDelayedPhase || hasAtRiskPhase;

    const workingDaysElapsed = getWorkingDays(project.startDate, today);
    const totalEstimatedDays = getWorkingDays(
      project.startDate,
      project.estimatedEndDate
    );

    const totalEstimatedHours = phaseStats.reduce(
      (sum, p) => sum + p.estimatedDuration,
      0
    );
    const totalActualHours = phaseStats.reduce(
      (sum, p) => sum + p.actualHoursLogged,
      0
    );

    const totalTasksAll = phaseStats.reduce((sum, p) => sum + p.taskSummary.total, 0);
    const completedTasksAll = phaseStats.reduce((sum, p) => sum + p.taskSummary.completed, 0);
    const projectProgress = totalTasksAll > 0
      ? Math.round((completedTasksAll / totalTasksAll) * 100)
      : 0;

    res.json({
      project: {
        _id: project._id,
        name: project.name,
        client: project.client,
        status: project.status,
        priority: project.priority,
        startDate: project.startDate,
        estimatedEndDate: project.estimatedEndDate,
        actualEndDate: project.actualEndDate,
      },
      summary: {
        totalPhases: phases.length,
        completedPhases: phaseStats.filter((p) => p.status === "completed").length,
        delayedPhases: phaseStats.filter((p) => p.isDelayed).length,
        atRiskPhases: phaseStats.filter((p) => p.isAtRisk).length,
        projectAtRisk,
        progressPercent: projectProgress,
        totalTasks: totalTasksAll,
        completedTasks: completedTasksAll,
        totalEstimatedHours,
        totalActualHours,
        hoursOverrun: totalActualHours > totalEstimatedHours
          ? totalActualHours - totalEstimatedHours
          : 0,
        workingDaysElapsed,
        totalEstimatedDays,
        daysRemaining: totalEstimatedDays - workingDaysElapsed,
      },
      phases: phaseStats,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getEmployeeStats = async (req, res) => {
  try {
    const entries = await TimeEntry.aggregate([
      { $match: { employee: require("mongoose").Types.ObjectId.createFromHexString(req.params.employeeId) } },
      {
        $group: {
          _id: "$project",
          totalHours: { $sum: "$hoursLogged" },
          taskCount: { $addToSet: "$task" },
        },
      },
      {
        $lookup: {
          from: "projects",
          localField: "_id",
          foreignField: "_id",
          as: "project",
        },
      },
      { $unwind: "$project" },
      {
        $project: {
          projectName: "$project.name",
          totalHours: 1,
          taskCount: { $size: "$taskCount" },
        },
      },
    ]);

    const totalHours = entries.reduce((sum, e) => sum + e.totalHours, 0);

    res.json({ totalHours, projects: entries });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
