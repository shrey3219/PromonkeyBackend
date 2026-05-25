const router = require("express").Router();
const { register, login, employeeLogin, clientLogin, updateProfile } = require("../controllers/authController");
const { upload } = require("../config/cloudinary");
const { protect } = require("../middleware/authMiddleware");

// Admin register — optional profile image
router.post("/register", upload.single("profileImage"), register);
router.post("/login", login);
router.post("/employee-login", employeeLogin);
router.post("/client-login", clientLogin);

// Profile update — admin, employee & client sab use kar sakte hain
router.put("/update-profile", protect, upload.single("profileImage"), updateProfile);

module.exports = router;
