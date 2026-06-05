const Project = require("../models/Project");
const Phase = require("../models/Phase");
const Task = require("../models/Task");
const Client = require("../models/Client");
const Employee = require("../models/Employee");
const TimeEntry = require("../models/TimeEntry");

// ─── GET /api/dashboard
exports.getDashboard = async (req, res) => {
  try {
    const { role, _id: userId } = req.user;

    // ── ADMIN DASHBOARD 
    if (role === "admin") {
      const [
        totalProjects,
        totalClients,
        totalEmployees,
        totalPhases,
        totalTasks,
        projectsByStatus,
        tasksByStatus,
        phasesByStatus,
        recentProjects,
        recentClients,
        recentEmployees,
      ] = await Promise.all([
        Project.countDocuments(),
        Client.countDocuments(),
        Employee.countDocuments(),
        Phase.countDocuments(),
        Task.countDocuments(),
        Project.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
        Task.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
        Phase.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
        Project.find()
          .sort({ createdAt: -1 })
          .limit(5)
          .populate("client", "clientName companyName profileImage")
          .populate("createdBy", "name email")
          .select("name status priority startDate estimatedEndDate createdAt client createdBy"),
        Client.find()
          .sort({ createdAt: -1 })
          .limit(5)
          .populate("createdBy", "name email")
          .select("clientName companyName email phone profileImage createdAt createdBy"),
        Employee.find()
          .sort({ createdAt: -1 })
          .limit(5)
          .populate("user", "name email profileImage")
          .populate("role", "name")
          .select("employeeId department joiningDate status user role createdAt"),
      ]);

      // Total hours logged across all time entries
      const hoursAgg = await TimeEntry.aggregate([
        { $group: { _id: null, totalHours: { $sum: "$hoursLogged" } } },
      ]);

      // Projects at risk 
      const atRiskProjects = await Project.find({
        estimatedEndDate: { $lt: new Date() },
        status: { $nin: ["completed", "cancelled"] },
      })
        .populate("client", "clientName companyName profileImage")
        .select("name status priority startDate estimatedEndDate client");

      // Overdue tasks (past dueDate and not completed)
      const overdueTasksCount = await Task.countDocuments({
        dueDate: { $lt: new Date() },
        status: { $nin: ["completed"] },
      });

      const topEmployees = await TimeEntry.aggregate([
        { $group: { _id: "$employee", totalHours: { $sum: "$hoursLogged" } } },
        { $sort: { totalHours: -1 } },
        { $limit: 5 },
        {
          $lookup: {
            from: "employees",
            localField: "_id",
            foreignField: "_id",
            as: "employee",
          },
        },
        { $unwind: "$employee" },
        {
          $lookup: {
            from: "users",
            localField: "employee.user",
            foreignField: "_id",
            as: "user",
          },
        },
        { $unwind: "$user" },
        {
          $project: {
            totalHours: 1,
            employeeId: "$employee.employeeId",
            department: "$employee.department",
            name: "$user.name",
            email: "$user.email",
            profileImage: "$user.profileImage",
          },
        },
      ]);

      const projectsByPriority = await Project.aggregate([
        { $group: { _id: "$priority", count: { $sum: 1 } } },
      ]);

      return res.json({
        role: "admin",
        stats: {
          totalProjects,
          totalClients,
          totalEmployees,
          totalPhases,
          totalTasks,
          atRiskProjectsCount: atRiskProjects.length,
          overdueTasksCount,
          totalHoursLogged: hoursAgg[0]?.totalHours || 0,
        },
        projectsByStatus: projectsByStatus.reduce((acc, s) => {
          acc[s._id] = s.count;
          return acc;
        }, {}),
        projectsByPriority: projectsByPriority.reduce((acc, p) => {
          acc[p._id] = p.count;
          return acc;
        }, {}),
        tasksByStatus: tasksByStatus.reduce((acc, t) => {
          acc[t._id] = t.count;
          return acc;
        }, {}),
        phasesByStatus: phasesByStatus.reduce((acc, p) => {
          acc[p._id] = p.count;
          return acc;
        }, {}),
        atRiskProjects,
        recentProjects,
        recentClients,
        recentEmployees,
        topEmployeesByHours: topEmployees,
      });
    }

    // ── EMPLOYEE DASHBOARD
    if (role === "employee") {
      const empRecord = await Employee.findOne({ user: userId });
      if (!empRecord) {
        return res.status(403).json({ message: "No employee record found" });
      }

      // Phases assigned to this employee
      const assignedPhases = await Phase.find({ assignees: empRecord._id })
        .populate("project", "name status")
        .select("name status project estimatedEndDate");

      // Unique projects from phases
      const projectIds = [...new Set(assignedPhases.map((p) => p.project?._id?.toString()).filter(Boolean))];

      // Tasks assigned to this employee
      const [myTasks, taskSummary] = await Promise.all([
        Task.find({ assignedTo: empRecord._id })
          .sort({ dueDate: 1 })
          .limit(5)
          .populate("project", "name")
          .populate("phase", "name")
          .select("name status dueDate project phase estimatedHours"),
        Task.aggregate([
          { $match: { assignedTo: empRecord._id } },
          { $group: { _id: "$status", count: { $sum: 1 } } },
        ]),
      ]);

      // Hours logged by this employee
      const hoursAgg = await TimeEntry.aggregate([
        { $match: { employee: empRecord._id } },
        { $group: { _id: null, totalHours: { $sum: "$hoursLogged" } } },
      ]);

      const overdueCount = await Task.countDocuments({
        assignedTo: empRecord._id,
        dueDate: { $lt: new Date() },
        status: { $nin: ["completed"] },
      });

      return res.json({
        role: "employee",
        stats: {
          totalAssignedProjects: projectIds.length,
          totalAssignedPhases: assignedPhases.length,
          totalHoursLogged: hoursAgg[0]?.totalHours || 0,
          overdueTasksCount: overdueCount,
        },
        tasksByStatus: taskSummary.reduce((acc, t) => {
          acc[t._id] = t.count;
          return acc;
        }, {}),
        recentTasks: myTasks,
        assignedPhases,
      });
    }

    // ── CLIENT DASHBOARD 
    if (role === "client") {
      const clientRecord = await Client.findOne({ user: userId });
      if (!clientRecord) {
        return res.status(403).json({ message: "No client record found" });
      }

      const myProjects = await Project.find({ client: clientRecord._id })
        .sort({ createdAt: -1 })
        .select("name status priority startDate estimatedEndDate");

      const projectIds = myProjects.map((p) => p._id);

      // Phase summary across client's projects
      const phaseSummary = await Phase.aggregate([
        { $match: { project: { $in: projectIds } } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]);

      return res.json({
        role: "client",
        client: {
          _id: clientRecord._id,
          clientName: clientRecord.clientName,
          companyName: clientRecord.companyName,
          email: clientRecord.email,
          phone: clientRecord.phone,
          address: clientRecord.address,
          profileImage: clientRecord.profileImage,
        },
        stats: {
          totalProjects: myProjects.length,
        },
        projectsByStatus: myProjects.reduce((acc, p) => {
          acc[p.status] = (acc[p.status] || 0) + 1;
          return acc;
        }, {}),
        phasesByStatus: phaseSummary.reduce((acc, p) => {
          acc[p._id] = p.count;
          return acc;
        }, {}),
        recentProjects: myProjects.slice(0, 5),
      });
    }

    res.status(400).json({ message: "Unknown role" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
