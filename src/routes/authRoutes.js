const router = require("express").Router();
const { register, login, employeeLogin, clientLogin, updateProfile, unifiedLogin } = require("../controllers/authController");
const { uploadAdmin } = require("../config/cloudinary");
const { protect } = require("../middleware/authMiddleware");

router.post("/unified-login", unifiedLogin);

router.post("/register", uploadAdmin.single("profileImage"), register);
router.post("/login", login);
router.post("/employee-login", employeeLogin);
router.post("/client-login", clientLogin);

router.put("/update-profile", protect, uploadAdmin.single("profileImage"), updateProfile);

module.exports = router;
