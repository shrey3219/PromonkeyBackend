const router = require("express").Router();
const { protect, blockClient } = require("../middleware/authMiddleware");
const { createComment, getComments, deleteComment } = require("../controllers/commentController");

router.post("/", protect, blockClient, createComment);
router.get("/", protect, blockClient, getComments);
router.delete("/:id", protect, blockClient, deleteComment);

module.exports = router;
