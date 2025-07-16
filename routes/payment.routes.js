const router = require("express").Router();

const { createPayment, index, show, notificationMidtrans} = require("../controllers/payment.controllers");
const { restrict } = require("../middlewares/auth.middlewares");

router.post("/payment/midtrans/confirm-midtrans", notificationMidtrans);
router.get("/payments",restrict, index);
router.get("/payment/:id",restrict, show);
router.post("/payment/midtrans/:orderId", restrict, createPayment);
// router.post("/payment/midtrans/:orderId", restrict, midtrans);
// router.post("/paymentDP/midtrans/:orderId", restrict, downPayment);

module.exports = router;