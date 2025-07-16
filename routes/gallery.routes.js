const router = require("express").Router();
const { getGallery, create, destroy } = require("../controllers/gallery.controllers");
const { restrict } = require("../middlewares/auth.middlewares");

// API Gallery
router.post("/gallery", restrict, create);
router.get("/gallery", getGallery);
router.delete("/gallery/:id", restrict, destroy);

module.exports = router;