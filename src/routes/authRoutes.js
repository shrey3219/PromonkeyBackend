const router = require("express").Router();
const { register, login, employeeLogin } = require("../controllers/authController");

router.post("/register", register);
router.post("/login", login);                    // Admin only
router.post("/employee-login", employeeLogin);   // Employee only (mobile)

module.exports = router;
