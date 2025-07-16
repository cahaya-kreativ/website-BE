const router = require("express").Router();
const { getDetail, updateProfile, updatePass } = require("../controllers/profile.controllers");
const { restrict } = require("../middlewares/auth.middlewares");

router.get('/users/profile', restrict, getDetail);
router.put('/users/profile', restrict, updateProfile);
router.put('/users/profile/change-password', restrict, updatePass)

module.exports = router;