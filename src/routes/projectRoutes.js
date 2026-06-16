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
  getProjectEmployees,
} = require("../controllers/projectController");

router.post(
  "/",
  protect,
  authorize("admin"),
  uploadProjectDocs.array("requirementDocs", 10),
  createProject
);
router.get("/", protect, checkPermission("Projects", "read"), getProjects);
router.get("/:id", protect, checkPermission("Projects", "read"), getProjectById);
router.get("/:id/employees", protect, authorize("admin"), getProjectEmployees);
router.put(
  "/:id",
  protect,
  authorize("admin"),
  uploadProjectDocs.array("requirementDocs", 10),
  updateProject
);
router.delete("/:id/docs/:docId", protect, authorize("admin"), deleteRequirementDoc);
router.delete("/:id", protect, authorize("admin"), deleteProject);

module.exports = router;
