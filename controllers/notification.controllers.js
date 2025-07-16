const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { utcTimePlus7, formatDateTimeWIB } = require("../utils/formattedDate");
const paginationReq = require("../utils/pagination");

module.exports = {
  getNotification: async (req, res, next) => {
    try {
      const { find, filter, page = 1 } = req.query;
      const pagination = paginationReq.paginationPage(Number(page), 10);

      // Build where conditions
      const conditions = {
        user_id: req.user.id,
      };

      if (find) {
        conditions.title = { contains: find, mode: "insensitive" };
      }

      if (filter) {
        conditions.title = { equals: filter, mode: "insensitive" };
      }

      // Hitung total notifikasi yang belum dibaca
      const unreadCount = await prisma.notification.count({
        where: {
          user_id: req.user.id,
          isRead: false,
        },
      });

      const totalData = await prisma.notification.count({ where: conditions });
      const totalPage = Math.ceil(totalData / pagination.take);

      const notifications = await prisma.notification.findMany({
        where: conditions,
        take: pagination.take,
        skip: pagination.skip,
        orderBy: {
          createdAt: "desc",
        },
      });

      // Format dates
      const formattedNotifications = notifications.map((notification) => ({
        ...notification,
        createdAt: formatDateTimeWIB(notification.createdAt),
      }));

      res.status(200).json({
        status: true,
        message: "Notifications retrieved successfully",
        data: {
          notifications: formattedNotifications,
          unreadCount,
          pagination: {
            page: Number(page) ?? 1,
            per_page: pagination.take,
            pageCount: totalPage,
            total_items: totalData,
            total_pages: Math.ceil(totalData / pagination.take),
          },
        },
      });
    } catch (err) {
      next(err);
    }
  },
  readNotification: async (req, res, next) => {
    try {
      const notifications = await prisma.notification.updateMany({
        where: { user_id: Number(req.user.id) },
        data: {
          isRead: true,
        },
      });

      res.status(200).json({
        status: true,
        message: "All Notifications marked as read",
        data: notifications,
      });
    } catch (err) {
      next(err);
    }
  },
  readNotificationId: async (req, res, next) => {
    try {
      const { notificationId } = req.params;
      if (!notificationId || isNaN(notificationId)) {
        return res.status(400).json({
          status: false,
          message: "Invalid Notification ID",
          data: null,
        });
      }

      const notification = await prisma.notification.update({
        where: { id: Number(notificationId) },
        data: {
          isRead: true,
        },
      });

      if (!notification) {
        return res.status(404).json({
          status: false,
          message: "Notification not found",
        });
      }

      const formattedNotification = {
        ...notification,
        createdAt: formatDateTimeWIB(notification.createdAt),
      };

      res.status(200).json({
        status: true,
        message: "Notification marked as read",
        data: formattedNotification,
      });
    } catch (err) {
      // Handle specific Prisma errors
      if (err.code === "P2025") {
        return res.status(404).json({
          status: false,
          message: "Notification not found",
          data: null,
        });
      }
      next(err);
    }
  },
  create: async (req, res, next) => {
    try {
      const { title, message } = req.body;

      if (!title) {
        return res.status(400).json({
          status: false,
          message: "Title is required fields",
        });
      }

      if (!message) {
        return res.status(400).json({
          status: false,
          message: "Message is required fields",
        });
      }

      const allUsers = await prisma.user.findMany({
        where: {
          role: "user", // Only select users with 'user' role
        },
        select: { id: true },
      });

      const newNotifications = await prisma.notification.createMany({
        data: allUsers.map((user) => ({
          title,
          message,
          user_id: user.id,
          createdAt: new Date(utcTimePlus7()), // Explicitly set createdAt
        })),
      });

      res.status(201).json({
        status: true,
        message: "Notifications created for all users",
        data: {
          count: newNotifications.count,
          affectedUsers: allUsers.length,
        },
      });
    } catch (error) {
      next(error);
    }
  },
};
