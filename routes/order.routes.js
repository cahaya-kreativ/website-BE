const router = require("express").Router();

const { order, getAll, getDetail, generateQR, orderDone, orderCancel, validateOrder, cronjobStatus } = require("../controllers/order.controllers");
const { restrict } = require("../middlewares/auth.middlewares");

router.post("/order/:productId", restrict, order);
router.post("/QR/order", restrict, generateQR);
router.get("/orders", restrict, getAll); 
router.get("/order/:orderId", restrict, getDetail);
router.put("/order/done/:id", restrict, orderDone);
router.put("/order/cancel/:id", restrict, orderCancel);
router.put("/order/validate/:id", restrict, validateOrder);
router.post("/cronjob", cronjobStatus);

module.exports = router;