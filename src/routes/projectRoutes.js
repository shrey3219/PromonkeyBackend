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

router.post(
  "/",
  protect,
  authorize("admin"),
  uploadProjectDocs.array("requirementDocs", 10),
  createProject
);
router.get("/", protect, checkPermission("Projects", "read"), getProjects);
router.get("/:id", protect, checkPermission("Projects", "read"), getProjectById);
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
