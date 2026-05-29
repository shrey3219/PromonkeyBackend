const router = require("express").Router();
const { protect, authorize, checkPermission } = require("../middleware/authMiddleware");
const { uploadProjectDocs } = require("../config/cloudinary");
const {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject,
  deleteRequirementDoc,
} = require("../controllers/projectController");

// Create project — admin only, supports up to 10 requirement doc uploads
router.post(
  "/",
  protect,
  authorize("admin"),
  uploadProjectDocs.array("requirementDocs", 10),
  createProject
);

// List all projects — admin/employee with permission, or client (sees own)
router.get("/", protect, checkPermission("Projects", "read"), getProjects);

// Get single project
router.get("/:id", protect, checkPermission("Projects", "read"), getProjectById);

// Update project — admin only, can also upload more docs
router.put(
  "/:id",
  protect,
  authorize("admin"),
  uploadProjectDocs.array("requirementDocs", 10),
  updateProject
);

// Delete a single requirement doc from a project
router.delete("/:id/docs/:docId", protect, authorize("admin"), deleteRequirementDoc);

// Delete entire project
router.delete("/:id", protect, authorize("admin"), deleteProject);

module.exports = router;
