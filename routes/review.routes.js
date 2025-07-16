const router = require("express").Router();
const { create, getProductReviews, getUserReviews, update } = require("../controllers/review.controllers");
const { restrict } = require("../middlewares/auth.middlewares");

// Create review (perlu login)
router.post("/reviews/:orderId", restrict, create);
// Get product reviews (public)
router.get("/reviews/products/:productId", getProductReviews);
// Get user reviews (perlu login)
router.get("/user/reviews", restrict, getUserReviews);
// Update review (perlu login)
router.put("/reviews/:id", restrict, update);

module.exports = router;
