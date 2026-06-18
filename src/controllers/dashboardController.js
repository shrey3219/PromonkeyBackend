const mongoose = require("mongoose");
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
          .populate({
            path: "client",
            select: "companyName",
            populate: { path: "user", select: "name profileImage" },
          })
          .populate("createdBy", "name email")
          .select("name status priority startDate estimatedEndDate createdAt client createdBy"),
        Client.find()
          .sort({ createdAt: -1 })
          .limit(5)
          .populate("createdBy", "name email")
          .populate("user", "name email phone profileImage")
          .select("companyName profileImage createdAt createdBy user"),
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
        .populate({
          path: "client",
          select: "companyName",
          populate: { path: "user", select: "name profileImage" },
        })
        .select("name status priority startDate estimatedEndDate client");

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


      const createdProjects = await Project.find({ createdBy: userId }, "_id");
      const memberProjects  = await Project.find({ assignedEmployees: empRecord._id }, "_id");
      const phasesAssigned  = await Phase.find({ assignees: empRecord._id }, "project");
      const phaseProjectIds = phasesAssigned.map((p) => p.project?.toString()).filter(Boolean);

      const allProjectIds = [
        ...new Set([
          ...createdProjects.map((p) => p._id.toString()),
          ...memberProjects.map((p)  => p._id.toString()),
          ...phaseProjectIds,
        ]),
      ];


      const ownerProjectIds = [
        ...new Set([
          ...createdProjects.map((p) => p._id.toString()),
          ...memberProjects.map((p)  => p._id.toString()),
        ]),
      ];

      const [ownerPhases, assigneePhases] = await Promise.all([

        Phase.find({ project: { $in: ownerProjectIds } })
          .populate("project", "name status")
          .select("name status project estimatedEndDate"),
        Phase.find({ assignees: empRecord._id })
          .populate("project", "name status")
          .select("name status project estimatedEndDate"),
      ]);

      const phaseMap = new Map();
      [...ownerPhases, ...assigneePhases].forEach((p) => phaseMap.set(p._id.toString(), p));
      const allPhases = [...phaseMap.values()];

 
      const [ownerTasks, assignedTasks] = await Promise.all([
        Task.find({ project: { $in: ownerProjectIds } }, "_id"),
        Task.find({ assignedTo: empRecord._id }, "_id"),
      ]);
      const taskIdSet = new Set([
        ...ownerTasks.map((t) => t._id.toString()),
        ...assignedTasks.map((t) => t._id.toString()),
      ]);
      const allAccessibleTaskIds = [...taskIdSet];

      // ── Stats queries
      const [myTasks, taskSummary, hoursAgg, overdueCount] = await Promise.all([
        Task.find({ _id: { $in: allAccessibleTaskIds } })
          .sort({ dueDate: 1 })
          .limit(5)
          .populate("project", "name")
          .populate("phase", "name")
          .select("name status dueDate project phase estimatedHours"),
        Task.aggregate([
          { $match: { _id: { $in: allAccessibleTaskIds.map((id) => new mongoose.Types.ObjectId(id)) } } },
          { $group: { _id: "$status", count: { $sum: 1 } } },
        ]),
        TimeEntry.aggregate([
          { $match: { employee: empRecord._id } },
          { $group: { _id: null, totalHours: { $sum: "$hoursLogged" } } },
        ]),
        Task.countDocuments({
          _id: { $in: allAccessibleTaskIds },
          dueDate: { $lt: new Date() },
          status: { $nin: ["completed"] },
        }),
      ]);

      return res.json({
        role: "employee",
        stats: {
          totalAssignedProjects: allProjectIds.length,
          totalAssignedPhases:   allPhases.length,
          totalHoursLogged:      hoursAgg[0]?.totalHours || 0,
          overdueTasksCount:     overdueCount,
        },
        tasksByStatus: taskSummary.reduce((acc, t) => {
          acc[t._id] = t.count;
          return acc;
        }, {}),
        recentTasks:    myTasks,
        assignedPhases: allPhases,
      });
    }

    // ── CLIENT DASHBOARD 
    if (role === "client") {
      const clientRecord = await Client.findOne({ user: userId })
        .populate("user", "name email phone profileImage");
      if (!clientRecord) {
        return res.status(403).json({ message: "No client record found" });
      }

      const myProjects = await Project.find({ client: clientRecord._id })
        .sort({ createdAt: -1 })
        .select("name status priority startDate estimatedEndDate");

      const projectIds = myProjects.map((p) => p._id);

      const phaseSummary = await Phase.aggregate([
        { $match: { project: { $in: projectIds } } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]);

      return res.json({
        role: "client",
        client: {
          _id: clientRecord._id,
          companyName: clientRecord.companyName,
          name: clientRecord.user?.name,
          email: clientRecord.user?.email,
          phone: clientRecord.user?.phone,
          address: clientRecord.address,
          profileImage: clientRecord.user?.profileImage,
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
