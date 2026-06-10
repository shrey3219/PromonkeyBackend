const router = require("express").Router();
const { register, login, employeeLogin, clientLogin, updateProfile, changePassword, unifiedLogin, getProfile } = require("../controllers/authController");
const { uploadAdmin, uploadEmployee, uploadClient } = require("../config/cloudinary");
const { protect } = require("../middleware/authMiddleware");
 
// Dynamic upload middleware — picks the right Cloudinary folder based on the logged-in user's role
const dynamicUpload = (req, res, next) => {
  let uploader;
  const role = req.user && req.user.role;
  if (role === "employee") uploader = uploadEmployee;
  else if (role === "client") uploader = uploadClient;
  else uploader = uploadAdmin; // admin or fallback
 
  uploader.single("profileImage")(req, res, next);
};
 
router.post("/unified-login", unifiedLogin);
 
router.post("/register", uploadAdmin.single("profileImage"), register);
router.post("/login", login);
router.post("/employee-login", employeeLogin);
router.post("/client-login", clientLogin);
 
// protect runs first (sets req.user), then dynamicUpload picks the right folder
router.get("/profile", protect, getProfile);
router.put("/update-profile", protect, dynamicUpload, updateProfile);
router.put("/change-password", protect, changePassword);
 
module.exports = router;