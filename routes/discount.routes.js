const router = require("express").Router();
const {
  applyDiscount,
  getDiscounts,
  createDiscount,
  updateDiscount,
  deleteDiscount,
} = require("../controllers/discount.controllers");
const { restrict } = require("../middlewares/auth.middlewares");

// API Discount Product
router.put("/order/discount", restrict, applyDiscount);
router.post("/discount", restrict, createDiscount);
router.get("/discount", restrict, getDiscounts);
router.put("/discount/:id", restrict, updateDiscount);
router.delete("/discount/:id", restrict, deleteDiscount);

module.exports = router;