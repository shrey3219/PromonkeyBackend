const Project = require("../models/Project");
const Phase = require("../models/Phase");
const Task = require("../models/Task");
const TimeEntry = require("../models/TimeEntry");

// Helper — calculate working days between two dates (Mon–Fri)
const getWorkingDays = (startDate, endDate) => {
  let count = 0;
  const current = new Date(startDate);
  const end = new Date(endDate);
  while (current <= end) {
    const day = current.getDay();
    if (day !== 0 && day !== 6) count++; // skip Sun(0) and Sat(6)
    current.setDate(current.getDate() + 1);
  }
  return count;
};

// ─── GET /api/stats/project/:projectId ────────────────────────────────────────
exports.getProjectStats = async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId)
      .populate("client", "clientName companyName");

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    const today = new Date();

    // Get all phases for this project
    const phases = await Phase.find({ project: project._id }).sort({ order: 1 });

    // For each phase — compute stats
    const phaseStats = await Promise.all(
      phases.map(async (phase) => {
        // Sum all time entries for this phase
        const timeAgg = await TimeEntry.aggregate([
          { $match: { phase: phase._id } },
          { $group: { _id: null, totalHours: { $sum: "$hoursLogged" } } },
        ]);
        const actualHours = timeAgg[0]?.totalHours || 0;

        // Overrun check
        const isDelayed = actualHours > phase.estimatedDuration;
        const hoursOverrun = isDelayed ? actualHours - phase.estimatedDuration : 0;

        // At risk check — today past estimated end date and not completed
        const isAtRisk =
          phase.estimatedEndDate &&
          today > new Date(phase.estimatedEndDate) &&
          phase.status !== "completed";

        // Task summary for this phase
        const tasks = await Task.find({ phase: phase._id });
        const taskSummary = {
          total: tasks.length,
          completed: tasks.filter((t) => t.status === "completed").length,
          inProgress: tasks.filter((t) => t.status === "in_progress").length,
          notStarted: tasks.filter((t) => t.status === "not_started").length,
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
          estimatedEndDate: phase.estimatedEndDate,
          actualStart: phase.actualStart,
          actualEnd: phase.actualEnd,
          taskSummary,
        };
      })
    );

    // Project-level flags
    const hasDelayedPhase = phaseStats.some((p) => p.isDelayed);
    const hasAtRiskPhase = phaseStats.some((p) => p.isAtRisk);
    const projectAtRisk = hasDelayedPhase || hasAtRiskPhase;

    // Working days elapsed vs total estimated
    const workingDaysElapsed = getWorkingDays(project.startDate, today);
    const totalEstimatedDays = getWorkingDays(
      project.startDate,
      project.estimatedEndDate
    );

    // Total hours across all phases
    const totalEstimatedHours = phaseStats.reduce(
      (sum, p) => sum + p.estimatedDuration,
      0
    );
    const totalActualHours = phaseStats.reduce(
      (sum, p) => sum + p.actualHoursLogged,
      0
    );

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

// ─── GET /api/stats/employee/:employeeId ──────────────────────────────────────
// How many hours an employee has logged across tasks/projects
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
