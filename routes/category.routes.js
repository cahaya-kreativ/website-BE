const router = require("express").Router();
const {
  create,
  update,
  read,
  detail,
  destroy,
} = require("../controllers/category.controllers");
const { restrict } = require("../middlewares/auth.middlewares");

// API Category Product
router.post("/categories", restrict, create);
router.put("/categories/:id", restrict, update);
router.get("/categories", read);
router.get("/categories/:id", detail);
router.delete("/categories/:id", restrict, destroy);

module.exports = router;
