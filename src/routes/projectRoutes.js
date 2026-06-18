const router = require("express").Router();
const { protect, checkPermission, blockClient } = require("../middleware/authMiddleware");
const { uploadProjectDocs } = require("../config/cloudinary");
const {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject,
  deleteRequirementDoc,
  getProjectEmployees,
  getProjectMembers,
} = require("../controllers/projectController");

router.post(
  "/",
  protect,
  blockClient,
  checkPermission("Projects", "create"),
  uploadProjectDocs.array("requirementDocs", 10),
  createProject
);
router.get("/", protect, checkPermission("Projects", "read"), getProjects);
router.get("/:id", protect, checkPermission("Projects", "read"), getProjectById);
router.get("/:id/employees", protect, blockClient, checkPermission("Projects", "read"), getProjectEmployees);
router.get("/:id/members",   protect, checkPermission("Projects", "read"), getProjectMembers);
router.put(
  "/:id",
  protect,
  blockClient,
  checkPermission("Projects", "update"),
  uploadProjectDocs.array("requirementDocs", 10),
  updateProject
);
router.delete("/:id/docs/:docId", protect, blockClient, checkPermission("Projects", "update"), deleteRequirementDoc);
router.delete("/:id", protect, blockClient, checkPermission("Projects", "delete"), deleteProject);

module.exports = router;
