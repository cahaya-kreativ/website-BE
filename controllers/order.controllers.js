const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { generatedOrderCode } = require("../utils/orderCodeGenerator");
const imageKit = require("../libs/imagekit");
const qr = require("qr-image");
const { utcTimePlus7, formatDateTimeWIB } = require("../utils/formattedDate");
const paginationReq = require("../utils/pagination");

module.exports = {
  order: async (req, res, next) => {
    try {
      const {
        date,
        time,
        location,
        note,
        quantity,
        discountCode,
        fullname,
        phoneNumber,
      } = req.body;
      const { productId } = req.params;
      const user_id = req.user.id;

      // Validasi fullname dan phoneNumber
      if (!fullname) {
        return res.status(400).json({
          status: false,
          message: "Fullname are required.",
          data: null,
        });
      }
      if (!phoneNumber) {
        return res.status(400).json({
          status: false,
          message: "Phone number are required.",
          data: null,
        });
      }

      // Ambil data user dari database
      const user = await prisma.user.findUnique({
        where: { id: user_id },
        select: { fullname: true, phoneNumber: true },
      });

      // Cek product exists dan ambil data product
      const product = await prisma.product.findUnique({
        where: { id: Number(productId) },
        include: { category: true },
      });
      if (!product) {
        return res.status(404).json({
          status: false,
          message: "Product not found",
          data: null,
        });
      }

      // Format waktu
      if (!time || time.trim() === "") {
        return res.status(400).json({
          status: false,
          message: "Time is required.",
          data: null,
        });
      }
      const [hours, minutes] = time.split(".");
      const formattedTime = new Date(date);
      formattedTime.setHours(parseInt(hours), parseInt(minutes), 0);

      // Hitung endTime dan endDate
      const endTime = new Date(formattedTime);
      endTime.setHours(endTime.getHours() + product.duration);

      let endDate;
      if (product.category.id === 3) {
        endDate = new Date(formattedTime);
        endDate.setMonth(endDate.getMonth() + 1);
      } else {
        endDate = endTime;
      }

      // Hitung subtotal & totalAmount
      const subtotal = parseInt(product.price) * quantity;

      let discountAmount = 0;
      if (discountCode) {
        const discount = await prisma.discountCode.findUnique({
          where: { code: discountCode },
        });
        if (!discount || !discount.status) {
          return res.status(400).json({
            status: false,
            message: discount
              ? "Expired discount code"
              : "Invalid discount code",
            data: null,
          });
        }
        discountAmount = (subtotal * discount.percentage) / 100;
      }

      const totalAmount = subtotal - discountAmount;

      // Validasi jadwal (opsional, bisa dipakai seperti sebelumnya)
      if (product.category.id === 1 || product.category.id === 2) {
        const existingSchedule = await prisma.schedule.findFirst({
          where: {
            date: new Date(date),
            OR: [
              {
                AND: [
                  { time: { lte: formattedTime } },
                  { endTime: { gt: formattedTime } },
                ],
              },
              {
                AND: [{ time: { lt: endTime } }, { endTime: { gte: endTime } }],
              },
              {
                AND: [
                  { time: { gte: formattedTime } },
                  { endTime: { lte: endTime } },
                ],
              },
            ],
          },
        });

        if (formattedTime.getHours() < 7 || formattedTime.getHours() > 17) {
          return res.status(400).json({
            status: false,
            message: "Booking time must be between 07:00 and 17:00.",
            data: null,
          });
        }

        if (existingSchedule) {
          return res.status(400).json({
            status: false,
            message: "The schedule you selected is Booked.",
            data: null,
          });
        }
      }

      // Buat order dalam transaksi
      const result = await prisma.$transaction(async (tx) => {
        // Create schedule
        const schedule = await tx.schedule.create({
          data: {
            date: new Date(date),
            time: formattedTime,
            endTime: endTime,
            endDate: endDate,
            location,
            duration: product.duration,
            isBooked: true,
            createdAt: utcTimePlus7(),
          },
        });

        // Set nilai awal is_paid dan remaining_amount
        let remaining_amount = totalAmount; // Belum lunas

        const order = await tx.order.create({
          data: {
            code: generatedOrderCode(),
            note: note || null,
            total_amount: totalAmount,
            expired_paid: new Date(utcTimePlus7()),
            user_id,
            schedule_id: schedule.id,
            createdAt: utcTimePlus7(),
            remaining_amount,

            orderDetails: {
              create: {
                product_id: Number(productId),
                quantity: Number(quantity),
                price: product.price,
                subtotal,
                discount: discountAmount,
              },
            },
          },
          include: {
            schedule: true,
            orderDetails: {
              include: {
                product: true,
              },
            },
          },
        });

        // Update relasi schedule-order
        await tx.schedule.update({
          where: { id: schedule.id },
          data: {
            orders: {
              connect: { id: order.id },
            },
          },
        });

        return order;
      });

      // Update profil user jika diperlukan
      await prisma.user.update({
        where: { id: user_id },
        data: {
          fullname: fullname || user?.fullname,
          phoneNumber: phoneNumber || user?.phoneNumber,
        },
      });

      // Notifikasi
      await prisma.notification.create({
        data: {
          title: "Order Created",
          message: `Your order created successfully and awaiting admin approval!`,
          createdAt: utcTimePlus7(),
          user: { connect: { id: user_id } },
        },
      });

      res.status(201).json({
        status: true,
        message: "Order created successfully and awaiting approval",
        data: {
          order: result,
          discountAmount,
          totalAmount,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  getAll: async (req, res, next) => {
    try {
      const { find, filter, page = 1 } = req.query;
      const pagination = paginationReq.paginationPage(Number(page), 5);

      // Membangun kondisi pencarian
      const conditions = {
        user_id: req.user.id,
      };

      if (find) {
        conditions.code = { contains: find, mode: "insensitive" };
      }

      if (filter) {
        conditions.status = { equals: filter };
      }

      const totalData = await prisma.order.count({ where: conditions });
      const totalPage = Math.ceil(totalData / pagination.take);

      const orders = await prisma.order.findMany({
        where: conditions,
        take: pagination.take,
        skip: pagination.skip,
        include: {
          schedule: true,
          orderDetails: {
            include: {
              product: {
                include: {
                  reviews: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      const formattedOrders = orders.map((order) => ({
        ...order,
        createdAt: formatDateTimeWIB(order.createdAt),
        expired_paid: formatDateTimeWIB(order.expired_paid),
        is_paid: order.is_paid,
        remaining_amount: order.remaining_amount,
        schedule: order.schedule
          ? {
              ...order.schedule,
              createdAt: formatDateTimeWIB(order.schedule.createdAt),
              date: order.schedule.date.toISOString().split("T")[0],
              endDate: order.schedule.endDate.toISOString().split("T")[0],
              time: `${order.schedule.time.getHours()}.${order.schedule.time
                .getMinutes()
                .toString()
                .padStart(2, "0")}`,
              endTime: `${order.schedule.endTime.getHours()}.${order.schedule.endTime
                .getMinutes()
                .toString()
                .padStart(2, "0")}`,
            }
          : null, // Set schedule menjadi null jika tidak ada
      }));

      res.json({
        status: true,
        message: "Berhasil mendapatkan semua order",
        data: {
          formattedOrders,
          pagination: {
            page: Number(page) ?? 1,
            per_page: pagination.take,
            pageCount: totalPage,
            total_items: totalData,
            total_pages: Math.ceil(totalData / pagination.take),
          },
        },
      });
    } catch (error) {
      next(error);
    }
  },

  getDetail: async (req, res, next) => {
    try {
      const { orderId } = req.params;
      const user_id = req.user.id;

      const order = await prisma.order.findFirst({
        where: {
          id: Number(orderId),
          user_id: user_id,
        },
        include: {
          schedule: true,
          orderDetails: {
            include: {
              product: true,
            },
          },
          payments: true,
        },
      });

      if (!order) {
        return res.status(404).json({
          status: false,
          message: "Order tidak ditemukan",
          data: null,
        });
      }

      // Cek apakah order sudah direview oleh user
      const hasReviewed = await prisma.review.findFirst({
        where: {
          order_id: order.id, // Pastikan order_id sesuai
        },
      });

      const formattedOrder = {
        ...order,
        createdAt: formatDateTimeWIB(order.createdAt),
        expired_paid: formatDateTimeWIB(order.expired_paid),
        schedule: order.schedule
          ? {
              ...order.schedule,
              createdAt: formatDateTimeWIB(order.schedule.createdAt),
              date: order.schedule.date.toISOString().split("T")[0],
              endDate: order.schedule.endDate.toISOString().split("T")[0],
              time: `${order.schedule.time.getHours()}.${order.schedule.time
                .getMinutes()
                .toString()
                .padStart(2, "0")}`,
              endTime: `${order.schedule.endTime.getHours()}.${order.schedule.endTime
                .getMinutes()
                .toString()
                .padStart(2, "0")}`,
            }
          : null, // Set schedule menjadi null jika tidak ada
        fullname: order.fullname,
        phoneNumber: order.phoneNumber,
        hasReviewed: !!hasReviewed, // Menambahkan informasi apakah sudah direview
      };

      res.json({
        status: true,
        message: "Berhasil mendapatkan detail order",
        data: formattedOrder,
      });
    } catch (error) {
      next(error);
    }
  },

  orderDone: async (req, res, next) => {
    try {
      const { id } = req.params;

      const order = await prisma.order.findUnique({
        where: {
          id: Number(id),
        },
      });

      if (!order) {
        return res.status(404).json({
          status: false,
          message: "Order not found",
          data: null,
        });
      }

      //Validasi status order
      if (order.status === "pending") {
        return res.status(400).json({
          status: false,
          message:
            "Unable to complete order. Please validate for the order first",
          data: null,
        });
      }

      if (order.status === "unpaid") {
        return res.status(400).json({
          status: false,
          message: "Unable to complete order. Please pay for the order first",
          data: null,
        });
      }

      if (order.status === "process") {
        // Pastikan payments ada dan merupakan array
        if (!order.payments && !order.is_paid) {
          return res.status(400).json({
            status: false,
            message:
              "The order cannot be completed because payment has not been completed.",
            data: null,
          });
        }
      }

      if (order.status === "done") {
        return res.status(400).json({
          status: false,
          message: "Order is already complete",
          data: null,
        });
      }

      if (order.status === "cancelled") {
        return res.status(400).json({
          status: false,
          message: "Order is already cancelled",
          data: null,
        });
      }

      // Update order dan buat notifikasi dalam satu transaction
      const result = await prisma.$transaction(async (prisma) => {
        // Update status order
        const updatedOrder = await prisma.order.update({
          where: { id: Number(id) },
          data: { status: "done" },
          include: {
            orderDetails: {
              include: {
                product: true,
              },
            },
            schedule: true,
          },
        });

        // Notifikasi untuk customer
        await prisma.notification.create({
          data: {
            title: "Order Completed",
            message: `Your order ${order.code} has been completed. Thank you for using our service!`,
            user_id: order.user_id,
            createdAt: new Date(),
          },
        });

        return updatedOrder;
      });

      const formattedOrder = {
        ...result,
        createdAt: formatDateTimeWIB(result.createdAt),
        expired_paid: formatDateTimeWIB(result.expired_paid),
      };

      res.json({
        status: true,
        message: "Order marked as done successfully",
        data: formattedOrder,
      });
    } catch (error) {
      next(error);
    }
  },
  orderCancel: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      if (!reason) {
        return res.status(400).json({
          status: false,
          message: "Reason is required",
          data: null,
        });
      }

      // Cek order exists
      const order = await prisma.order.findUnique({
        where: {
          id: Number(id),
        },
        include: {
          schedule: true, // Include schedule to check if it exists
        },
      });

      if (!order) {
        return res.status(404).json({
          status: false,
          message: "Order not found",
          data: null,
        });
      }

      // Validasi status order
      if (order.status === "done") {
        return res.status(400).json({
          status: false,
          message: "Order is already complete",
          data: null,
        });
      }

      if (order.status === "cancelled") {
        return res.status(400).json({
          status: false,
          message: "Order is already cancelled",
          data: null,
        });
      }

      // Hapus jadwal yang terkait dengan order
      if (order.schedule) {
        await prisma.schedule.delete({
          where: { id: order.schedule.id }, // Delete based on schedule ID
        });
      }

      // Update order dan buat notifikasi dalam satu transaction
      const result = await prisma.$transaction(async (prisma) => {
        // Update status order dengan reason
        const updatedOrder = await prisma.order.update({
          where: { id: Number(id) },
          data: {
            status: "cancelled",
            note: `Alasan Cancel Order: ${reason}`,
          },
          include: {
            orderDetails: {
              include: {
                product: true,
              },
            },
            schedule: true,
          },
        });

        // Update payment status jika ada
        await prisma.payment.updateMany({
          where: { order_id: Number(id) },
          data: { status: "cancelled" },
        });

        // Notifikasi untuk customer
        await prisma.notification.create({
          data: {
            title: "Order Cancelled",
            message: `Your order ${order.code} has been cancelled. Because: ${reason}`,
            user_id: order.user_id,
            createdAt: new Date(),
          },
        });

        return updatedOrder;
      });

      const formattedOrder = {
        ...result,
        createdAt: formatDateTimeWIB(result.createdAt),
        expired_paid: formatDateTimeWIB(result.expired_paid),
      };

      res.json({
        status: true,
        message: "Order cancelled successfully",
        data: formattedOrder,
      });
    } catch (error) {
      next(error);
    }
  },

  validateOrder: async (req, res, next) => {
    try {
      const { id } = req.params; // Ambil ID order dari parameter

      // Cek apakah order ada
      const order = await prisma.order.findUnique({
        where: { id: Number(id) },
      });

      if (!order) {
        return res.status(404).json({
          status: false,
          message: "Order not found",
          data: null,
        });
      }

      // Validasi status order
      if (order.status === "unpaid") {
        return res.status(400).json({
          status: false,
          message: "Order is already validate",
          data: null,
        });
      }

      if (order.status === "process") {
        return res.status(400).json({
          status: false,
          message: "Order is already validate",
          data: null,
        });
      }

      if (order.status === "done") {
        return res.status(400).json({
          status: false,
          message: "Order is already complete",
          data: null,
        });
      }

      if (order.status === "cancelled") {
        return res.status(400).json({
          status: false,
          message: "Order is already cancelled",
          data: null,
        });
      }

      // Set expired paid 8 jam dari sekarang
      const expired_paid = new Date(utcTimePlus7());
      expired_paid.setHours(expired_paid.getHours() + 8);

      // Ubah status order menjadi unpaid
      const updatedOrder = await prisma.order.update({
        where: { id: Number(id) },
        data: { status: "unpaid", expired_paid }, // Ubah status menjadi unpaid
      });

      res.status(200).json({
        status: true,
        message: "Order status updated to unpaid",
        data: updatedOrder,
      });
    } catch (error) {
      next(error);
    }
  },

  generateQR: async (req, res, next) => {
    try {
      let { qr_data } = req.body;

      if (!qr_data) {
        return res.status(400).json({
          status: false,
          message: "qr_data is required",
          data: null,
        });
      }

      if (typeof qr_data !== "string") {
        return res.status(400).json({
          status: false,
          message: "qr_data must be a string",
          data: null,
        });
      }

      let qrCode = qr.imageSync(qr_data, { type: "png" });

      let { url } = await imageKit.upload({
        fileName: utcTimePlus7() + ".png",
        file: qrCode.toString("base64"),
      });

      return res.status(201).json({
        status: true,
        message: "Generate QR-Code Successfully",
        data: url,
      });
    } catch (error) {
      next(error);
    }
  },

  cronjobStatus: async (req, res, next) => {
    try {
      const { token } = req.query;

      if (!token || token !== process.env.CRONTAB_SECRET_TOKEN) {
        return res.status(401).json({ status: false, message: "Unauthorized" });
      }

      formattedDate = formatDateTimeWIB(new Date(utcTimePlus7()));

      const now = new Date(); // Ambil waktu saat ini
      const result = await prisma.order.updateMany({
        where: {
          status: {
            in: ["unpaid"],
          },
          expired_paid: {
            lt: now, // Memeriksa apakah expired_paid lebih kecil dari waktu saat ini
          },
        },
        data: {
          status: "cancelled", // Atur status menjadi expired
        },
      });

      console.log(
        `[${formattedDate}] Successfully updated ${result.count} order(s) to 'cancelled' status.`
      );

      res.status(200).json({
        status: true,
        count: result.count,
        message: `${result.count} order(s) have been updated to cancelled status.`,
      });
    } catch (error) {
      next(error);
    }
  },
};
