const router = require("express").Router();
const { register, login, employeeLogin, clientLogin, updateProfile, unifiedLogin } = require("../controllers/authController");
const { uploadAdmin } = require("../config/cloudinary");
const { protect } = require("../middleware/authMiddleware");

router.post("/unified-login", unifiedLogin);

// Role-specific login endpoints 
router.post("/register", uploadAdmin.single("profileImage"), register);
router.post("/login", login);
router.post("/employee-login", employeeLogin);
router.post("/client-login", clientLogin);

// Profile update
router.put("/update-profile", protect, uploadAdmin.single("profileImage"), updateProfile);

module.exports = router;
