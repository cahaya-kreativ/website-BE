const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { utcTimePlus7, formatDateTimeWIB } = require("../utils/formattedDate");

module.exports = {
  // Kirim pesan
  sendMessage: async (req, res, next) => {
    const { message, receiverId } = req.body;
    const senderId = req.user.id;
    const role = req.user.role;

    try {
      let actualReceiverId;

      if (!message || typeof message !== "string" || message.trim() === "") {
        return res.status(400).json({
          status: false,
          message: "Message is required",
        });
      }

      // Validasi role pengirim
      if (role === "user") {
        // User selalu mengirim ke admin pertama yang ditemukan
        const admin = await prisma.user.findFirst({
          where: { role: "admin" },
          select: { id: true },
        });

        if (!admin) {
          return res.status(404).json({
            status: false,
            message: "Admin not found",
          });
        }

        actualReceiverId = admin.id;
      } else if (role === "admin") {
        // Admin wajib menyebutkan userId sebagai penerima
        if (!receiverId || isNaN(receiverId)) {
          return res.status(400).json({
            status: false,
            message: "Valid user ID is required for admin to send message",
          });
        }

        const userExists = await prisma.user.findUnique({
          where: { id: Number(receiverId) },
        });

        if (!userExists) {
          return res.status(404).json({
            status: false,
            message: "User not found",
          });
        }

        actualReceiverId = Number(receiverId);
      } else {
        return res.status(400).json({
          status: false,
          message: "Invalid role",
        });
      }

      // Simpan pesan ke database
      const sendChat = await prisma.chat.create({
        data: {
          message: message.trim(),
          sender_id: senderId,
          receiver_id: actualReceiverId,
          createdAt: utcTimePlus7(),
        },
      });

      const formattedChat = {
        ...sendChat,
        createdAt: formatDateTimeWIB(sendChat.createdAt), // Format createdAt
      };

      // Notifikasi frontend bahwa pesan berhasil dikirim
      res.status(201).json({
        status: true,
        message: "Message sent successfully",
        data: formattedChat,
      });
    } catch (error) {
      console.error("Error sending message:", error.message);
      next(error);
    }
  },

  // Ambil semua pesan antara dua user
  getMessagesUser: async (req, res, next) => {
    const { senderId, receiverId } = req.params;
    const userId = req.user.id;

    try {
      const parsedSenderId = parseInt(senderId);
      const parsedReceiverId = parseInt(receiverId);

      if (isNaN(parsedSenderId) || isNaN(parsedReceiverId)) {
        return res.status(400).json({
          status: false,
          message: "Invalid senderId or receiverId",
          data: null,
        });
      }

      // Pastikan salah satu dari sender atau receiver adalah user yang login
      const isValidChat = [parsedSenderId, parsedReceiverId].includes(userId);

      if (!isValidChat) {
        return res.status(403).json({
          status: false,
          message: "You are not part of this conversation",
        });
      }

      const messages = await prisma.chat.findMany({
        where: {
          OR: [
            {
              sender_id: parsedSenderId,
              receiver_id: parsedReceiverId,
            },
            {
              sender_id: parsedReceiverId,
              receiver_id: parsedSenderId,
            },
          ],
        },
        orderBy: {
          createdAt: "asc",
        },
        include: {
          sender: {
            select: {
              fullname: true,
              id: true,
              role: true,
            },
          },
          receiver: {
            select: {
              fullname: true,
              id: true,
              role: true,
            },
          },
        },
      });

      const formattedChats = messages.map((chat) => ({
        ...chat,
        createdAt: formatDateTimeWIB(chat.createdAt), // Format createdAt
      }));

      // Tandai pesan sebagai sudah dibaca jika ada dari user lain
      await prisma.chat.updateMany({
        where: {
          sender_id:
            parsedSenderId === userId ? parsedReceiverId : parsedSenderId,
          receiver_id: userId,
          isRead: false,
        },
        data: {
          isRead: true,
        },
      });

      res.json({
        status: true,
        data: formattedChats,
      });
    } catch (error) {
      next(error);
    }
  },

  getChatWithUser: async (req, res, next) => {
    try {
      const adminId = req.user.id; // Ambil ID admin dari token atau session
      const { userId } = req.params; // Ambil ID pengguna dari parameter

      // Cek apakah pengguna ada
      const user = await prisma.user.findUnique({
        where: { id: Number(userId) },
      });

      if (!user) {
        return res.status(404).json({
          status: false,
          message: "User not found",
          data: null,
        });
      }

      // Ambil semua chat antara admin dan pengguna
      const chats = await prisma.chat.findMany({
        where: {
          OR: [
            { sender_id: adminId, receiver_id: Number(userId) },
            { sender_id: Number(userId), receiver_id: adminId },
          ],
        },
        orderBy: {
          createdAt: "asc", // Urutkan berdasarkan waktu
        },
      });
      
      const formattedInboxChats = chats.map((chat) => ({
        ...chat,
        createdAt: formatDateTimeWIB(chat.createdAt), // Format createdAt
      }));

      res.status(200).json({
        status: true,
        message: "Chat retrieved successfully",
        data: formattedInboxChats,
      });
    } catch (error) {
      console.error("Error retrieving chat:", error);
      next(error);
    }
  },

  // // Hanya ambil pesan masuk untuk admin (inbox)
  // getMessageAdmin: async (req, res, next) => {
  //   const adminId = req.user.id;

  //   try {
  //     const inbox = await prisma.chat.findMany({
  //       where: {
  //         receiver_id: adminId,
  //       },
  //       distinct: ["sender_id"],
  //       orderBy: {
  //         createdAt: "desc",
  //       },
  //       include: {
  //         sender: {
  //           select: {
  //             fullname: true,
  //             email: true,
  //             phoneNumber: true,
  //             id: true,
  //           },
  //         },
  //         receiver: {
  //           select: {
  //             id: true,
  //           },
  //         },
  //       },
  //     });

  //     const formattedInboxChats = inbox.map((chat) => ({
  //       ...chat,
  //       createdAt: formatDateTimeWIB(chat.createdAt), // Format createdAt
  //     }));

  //     res.json({
  //       status: true,
  //       data: formattedInboxChats,
  //     });
  //   } catch (error) {
  //     next(error);
  //   }
  // },
};
