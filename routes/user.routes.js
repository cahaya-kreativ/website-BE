const router = require("express").Router();
const { register, login, verifyOtp, resendOtp, forgetPassword, resetPassword, auth, googleOauth2, LoginGoogle } = require("../controllers/user.controllers");
const { restrict } = require("../middlewares/auth.middlewares");
const passport = require("../libs/passport")

// API Auth Users
router.post("/users/register", register);
router.post("/users/login", login);
router.put("/users/verify-otp", verifyOtp);
router.put("/users/resend-otp", resendOtp);
router.post("/users/forget-password", forgetPassword);
router.put("/users/reset-password", resetPassword);
router.get("/users/authenticate", restrict, auth);

// Google OAuth
router.get("/users/google",passport.authenticate("google", { scope: ["profile", "email"] }));  
router.get("/users/google/callback",passport.authenticate("google", {failureRedirect: "/users/google",session: false,}),googleOauth2);
router.post('/users/loginGoogle', LoginGoogle);

module.exports = router;
