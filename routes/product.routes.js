const router = require("express").Router();
const {
  create,
  update,
  read,
  detail,
  destroy,
} = require("../controllers/product.controllers");
const { restrict } = require("../middlewares/auth.middlewares");

// API Category Product
router.post("/product", restrict, create);
router.put("/product/:id", restrict, update);
router.get("/product", read);
router.get("/product/:id", detail);
router.delete("/product/:id", restrict, destroy);

module.exports = router;
