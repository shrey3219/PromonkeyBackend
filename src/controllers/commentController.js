const Comment = require("../models/Comment");
const Task = require("../models/Task");
const Phase = require("../models/Phase");
const Project = require("../models/Project");
const Employee = require("../models/Employee");
const User = require("../models/User");
const { getPaginationOptions, paginatedResponse } = require("../utils/paginate");

const populateComment = (query) =>
  query
    .populate("author", "name email profileImage role")
    .populate("taggedUsers", "name email profileImage role");


const getEmployee = async (userId) => Employee.findOne({ user: userId });

const canAccessTask = async (user, taskId) => {
  if (user.role === "admin") return true;
  if (user.role === "employee") {
    const emp = await getEmployee(user._id);
    if (!emp) return false;
    const task = await Task.findById(taskId);
    if (!task) return false;
   
    if (task.assignedTo?.toString() === emp._id.toString()) return true;
  
    const phase = await Phase.findOne({ _id: task.phase, assignees: emp._id });
    if (phase) return true;

    const project = await Project.findById(task.project);
    if (!project) return false;
    if (project.createdBy.toString() === user._id.toString()) return true;
    if (project.assignedEmployees?.some((e) => e.toString() === emp._id.toString())) return true;
    return false;
  }
  return false;
};

const canAccessPhase = async (user, phaseId) => {
  if (user.role === "admin") return true;
  if (user.role === "employee") {
    const emp = await getEmployee(user._id);
    if (!emp) return false;
    const phase = await Phase.findById(phaseId);
    if (!phase) return false;
    if (phase.assignees?.some((a) => a.toString() === emp._id.toString())) return true;
    const project = await Project.findById(phase.project);
    if (!project) return false;
    if (project.createdBy.toString() === user._id.toString()) return true;
    if (project.assignedEmployees?.some((e) => e.toString() === emp._id.toString())) return true;
    return false;
  }
  return false;
};

const canAccessProject = async (user, projectId) => {
  if (user.role === "admin") return true;
  if (user.role === "employee") {
    const emp = await getEmployee(user._id);
    if (!emp) return false;
    const project = await Project.findById(projectId);
    if (!project) return false;
    if (project.createdBy.toString() === user._id.toString()) return true;
    if (project.assignedEmployees?.some((e) => e.toString() === emp._id.toString())) return true;
    const phase = await Phase.findOne({ project: projectId, assignees: emp._id });
    if (phase) return true;
    return false;
  }
  return false;
};

exports.createComment = async (req, res) => {
  try {
    const { taskId, phaseId, projectId, text, taggedUsers } = req.body;

    if (!text) {
      return res.status(400).json({ message: "text is required" });
    }
    if (!taskId && !phaseId && !projectId) {
      return res.status(400).json({ message: "Either taskId, phaseId, or projectId is required" });
    }

    let resolvedProjectId = projectId;

    if (taskId) {
      const task = await Task.findById(taskId);
      if (!task) return res.status(404).json({ message: "Task not found" });
      const allowed = await canAccessTask(req.user, taskId);
      if (!allowed) return res.status(403).json({ message: "Access denied. You are not assigned to this task." });
      if (!resolvedProjectId) {
        const phase = await Phase.findById(task.phase, "project");
        if (phase) resolvedProjectId = phase.project;
      }
    }

    if (phaseId) {
      const phase = await Phase.findById(phaseId);
      if (!phase) return res.status(404).json({ message: "Phase not found" });
      const allowed = await canAccessPhase(req.user, phaseId);
      if (!allowed) return res.status(403).json({ message: "Access denied. You are not assigned to this phase." });
      if (!resolvedProjectId) resolvedProjectId = phase.project;
    }

    if (projectId) {
      const project = await Project.findById(projectId);
      if (!project) return res.status(404).json({ message: "Project not found" });
      const allowed = await canAccessProject(req.user, projectId);
      if (!allowed) return res.status(403).json({ message: "Access denied. You are not assigned to this project." });
    }

    let validatedTaggedUsers = [];
    if (taggedUsers && Array.isArray(taggedUsers) && taggedUsers.length > 0 && resolvedProjectId) {
      const project = await Project.findById(resolvedProjectId)
        .populate("createdBy", "_id")
        .populate({ path: "assignedEmployees", populate: { path: "user", select: "_id" } });

      if (project) {
        const memberUserIds = new Set();
        memberUserIds.add(project.createdBy._id.toString());
        for (const emp of project.assignedEmployees || []) {
          if (emp.user) memberUserIds.add(emp.user._id.toString());
        }

        validatedTaggedUsers = taggedUsers.filter((uid) => {
          const id = uid.toString();
          return memberUserIds.has(id) && id !== req.user._id.toString();
        });
      }
    }
    // ──────────────────────────────────────────────────────────────────────

    const comment = await Comment.create({
      task: taskId || null,
      phase: phaseId || null,
      project: projectId || null,
      author: req.user._id,
      text,
      taggedUsers: validatedTaggedUsers,
    });

    const populated = await populateComment(Comment.findById(comment._id));

    const io = req.app.get("io");
    if (io) {
      if (taskId)    io.to(`task:${taskId}`).emit("new_comment", populated);
      if (phaseId)   io.to(`phase:${phaseId}`).emit("new_comment", populated);
      if (projectId) io.to(`project:${projectId}`).emit("new_comment", populated);
    }

    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getComments = async (req, res) => {
  try {
    const { task, phase, project } = req.query;
    const { page, limit } = getPaginationOptions(req.query);

    if (!task && !phase && !project) {
      return res.status(400).json({ message: "Either task, phase, or project query param is required" });
    }

    let filter = {};
    let accessAllowed = false;

    if (task) {
      accessAllowed = await canAccessTask(req.user, task);
      if (!accessAllowed) return res.status(403).json({ message: "Access denied. You are not assigned to this task." });
      filter = { task };
    } else if (phase) {
      accessAllowed = await canAccessPhase(req.user, phase);
      if (!accessAllowed) return res.status(403).json({ message: "Access denied. You are not assigned to this phase." });
      filter = { phase };
    } else if (project) {
      accessAllowed = await canAccessProject(req.user, project);
      if (!accessAllowed) return res.status(403).json({ message: "Access denied. You are not assigned to this project." });
      filter = { project };
    }

    const result = await Comment.paginate(filter, {
      page,
      limit,
      sort: { createdAt: 1 },
      populate: [
        { path: "author",      select: "name email profileImage role" },
        { path: "taggedUsers", select: "name email profileImage role" },
      ],
    });

    res.json(paginatedResponse(result));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteComment = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    const isAuthor = comment.author.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "admin";

    if (!isAuthor && !isAdmin) {
      return res.status(403).json({ message: "Not authorized to delete this comment" });
    }

    if (isAuthor && req.user.role === "employee") {
      const ageMs = Date.now() - new Date(comment.createdAt).getTime();
      if (ageMs > 5 * 60 * 1000) {
        return res.status(403).json({ message: "You can only delete your comment within 5 minutes" });
      }
    }

    await comment.deleteOne();

    const io = req.app.get("io");
    if (io) {
      if (comment.task)    io.to(`task:${comment.task}`).emit("delete_comment", { commentId: req.params.id });
      if (comment.phase)   io.to(`phase:${comment.phase}`).emit("delete_comment", { commentId: req.params.id });
      if (comment.project) io.to(`project:${comment.project}`).emit("delete_comment", { commentId: req.params.id });
    }

    res.json({ message: "Comment deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
