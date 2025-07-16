const router = require("express").Router();
const { sendMessage, getMessagesUser, getChatWithUser } = require("../controllers/chat.controllers");
const { restrict } = require("../middlewares/auth.middlewares");

// API Chatting
router.post("/chat", restrict, sendMessage);
// router.get("/chats/admin/inbox", restrict, getMessageAdmin);
router.get("/admin/chats/:userId", restrict, getChatWithUser);
router.get("/chats/:senderId/:receiverId", restrict, getMessagesUser);

module.exports = router;
