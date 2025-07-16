const router = require("express").Router();
const {
  create,
  update,
  read,
  detail,
  destroy,
} = require("../controllers/portfolio.controllers");
const { restrict } = require("../middlewares/auth.middlewares");

// API Category Product
router.post("/portfolio", restrict, create);
router.put("/portfolio/:id", restrict, update);
router.get("/portfolio", read);
router.get("/portfolio/:id", detail);
router.delete("/portfolio/:id", restrict, destroy);

module.exports = router;
