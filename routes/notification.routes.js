const router = require("express").Router();

const { getNotification, readNotification, readNotificationId, create } = require("../controllers/notification.controllers");
const { restrict } = require("../middlewares/auth.middlewares");

router.get("/notifications", restrict, getNotification);
router.put("/notifications/markAsRead/all",restrict, readNotification)
router.put("/notification/markAsRead/:notificationId", restrict, readNotificationId)
router.post("/notifications", restrict, create)

module.exports = router;
