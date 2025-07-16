const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { utcTimePlus7, formatDateTimeWIB } = require("../utils/formattedDate");
const { formatSchedule } = require("../utils/scheduleFormatter");

module.exports = {
  create: async (req, res, next) => {
    try {
      const { date, time, location, duration, note } = req.body;

      // Validasi input
      if (!date || !time || !location || !duration) {
        return res.status(400).json({
          status: false,
          message: "All fields are required",
          data: null,
        });
      }

      try {
        // Format time ke DateTime
        const [hours, minutes] = time.split(".");
        const formattedTime = new Date(date);
        formattedTime.setHours(parseInt(hours), parseInt(minutes), 0);

        // Hitung endTime
        const endTime = new Date(formattedTime);
        endTime.setHours(endTime.getHours() + parseInt(duration));

        // Hitung endDate (misalnya, jika kategori 3, durasi dianggap 1 bulan)
        let endDate = new Date(formattedTime);
        if (duration > 24) {
          // Assuming duration > 24 means 1 month
          endDate.setMonth(endDate.getMonth() + 1);
        } else {
          endDate.setHours(endDate.getHours() + parseInt(duration));
        }

        // Cek jadwal yang overlap
        const existingSchedule = await prisma.schedule.findFirst({
          where: {
            date: new Date(date),
            OR: [
              {
                AND: [
                  {
                    time: {
                      lte: formattedTime,
                    },
                    endTime: {
                      gt: formattedTime,
                    },
                  },
                ],
              },
              {
                AND: [
                  {
                    time: {
                      lt: endTime,
                    },
                    endTime: {
                      gte: endTime,
                    },
                  },
                ],
              },
              {
                AND: [
                  {
                    time: {
                      gte: formattedTime,
                    },
                    endTime: {
                      lte: endTime,
                    },
                  },
                ],
              },
            ],
          },
        });

        if (existingSchedule) {
          return res.status(400).json({
            status: false,
            message: "The schedule you selected is full.",
            data: null,
          });
        }

        const schedule = await prisma.schedule.create({
          data: {
            date: new Date(date),
            time: formattedTime,
            endTime: endTime,
            endDate: endDate, // Menyimpan endDate
            location,
            duration: parseInt(duration),
            isBooked: true,
            createdAt: utcTimePlus7(),
            note: note || null,
          },
        });

        // Format response
        const formattedSchedule = {
          ...schedule,
          date: schedule.date.toISOString().split("T")[0],
          time: time,
          endTime: `${(parseInt(hours) + parseInt(duration))
            .toString()
            .padStart(2, "0")}.${minutes}`,
          createdAt: formatDateTimeWIB(schedule.createdAt),
        };

        res.status(201).json({
          status: true,
          message: "Schedule created successfully",
          data: formattedSchedule,
        });
      } catch (error) {
        console.error("Error creating schedule:", error);
        return res.status(400).json({
          status: false,
          message: "Failed to create schedule",
          data: null,
        });
      }
    } catch (error) {
      next(error);
    }
  },

  read: async (req, res, next) => {
    try {
      const schedules = await prisma.schedule.findMany({
        include: {
          orders: {
            include: {
              user: { // Menyertakan detail pemesan
                select: {
                  id: true,
                  fullname: true,
                  email: true,
                },
              },
              orderDetails: { // Menyertakan detail produk melalui OrderDetail
                include: {
                  product: { // Menyertakan detail produk
                    select: {
                      id: true,
                      name: true,
                      price: true,
                      label: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      // Format setiap schedule tanpa menggunakan formatSchedule
      const formattedSchedules = schedules.map((schedule) => {
        const hours = schedule.time.getHours();
        const minutes = schedule.time.getMinutes().toString().padStart(2, "0");

        return {
          ...schedule,
          date: schedule.date.toISOString().split("T")[0],
          endDate: schedule.endDate.toISOString().split("T")[0],
          time: `${hours}.${minutes}`,
          endTime: `${(hours + schedule.duration)
            .toString()
            .padStart(2, "0")}.${minutes}`,
          createdAt: formatDateTimeWIB(schedule.createdAt),
          orders: schedule.orders.map(order => ({
            id: order.id,
            user: order.user, // Menyertakan detail pemesan
            orderDetails: order.orderDetails.map(orderDetail => ({
              product: orderDetail.product, // Menyertakan detail produk
              quantity: orderDetail.quantity,
              price: orderDetail.price,
              subtotal: orderDetail.subtotal,
            })),
          })),
        };
      });

      res.json({
        status: true,
        message: "Get all schedules success",
        data: formattedSchedules,
      });
    } catch (error) {
      next(error);
    }
  },

  detail: async (req, res, next) => {
    try {
      const { id } = req.params;

      const schedule = await prisma.schedule.findUnique({
        where: { id: Number(id) },
        include: {
          orders: {
            include: {
              user: { // Menyertakan detail pemesan
                select: {
                  id: true,
                  fullname: true,
                  email: true,
                },
              },
              orderDetails: { // Menyertakan detail produk melalui OrderDetail
                include: {
                  product: { // Menyertakan detail produk
                    select: {
                      id: true,
                      name: true,
                      price: true,
                      label: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!schedule) {
        return res.status(404).json({
          status: false,
          message: "Schedule not found",
          data: null,
        });
      }

      // Format time dan endTime tanpa menggunakan formatSchedule
      const hours = schedule.time.getHours();
      const minutes = schedule.time.getMinutes().toString().padStart(2, "0");

      const formattedSchedule = {
        ...schedule,
        date: schedule.date.toISOString().split("T")[0],
        endDate: schedule.endDate.toISOString().split("T")[0],
        time: `${hours}.${minutes}`,
        endTime: `${(hours + schedule.duration)
          .toString()
          .padStart(2, "0")}.${minutes}`,
        createdAt: formatDateTimeWIB(schedule.createdAt),
        orders: schedule.orders.map(order => ({
          id: order.id,
          user: order.user, // Menyertakan detail pemesan
          orderDetails: order.orderDetails.map(orderDetail => ({
            product: orderDetail.product, // Menyertakan detail produk
            quantity: orderDetail.quantity,
            price: orderDetail.price,
            subtotal: orderDetail.subtotal,
          })),
        })),
      };

      res.json({
        status: true,
        message: "Get schedule detail success",
        data: formattedSchedule,
      });
    } catch (error) {
      next(error);
    }
  },

  update: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { date, time, location, duration, note } = req.body;

      const existingSchedule = await prisma.schedule.findUnique({
        where: { id: Number(id) },
      });

      if (!existingSchedule) {
        return res.status(404).json({
          status: false,
          message: "Schedule not found",
          data: null,
        });
      }

      // Format time ke DateTime jika ada perubahan time
      let formattedTime = existingSchedule.time;
      let endTime = existingSchedule.endTime;

      if (time) {
        const [hours, minutes] = time.split(".");
        formattedTime = new Date();
        formattedTime.setHours(parseInt(hours), parseInt(minutes), 0);

        // Update endTime berdasarkan time baru
        endTime = new Date(formattedTime);
        endTime.setHours(
          endTime.getHours() + (duration || existingSchedule.duration)
        );
      } else if (duration) {
        // Update hanya endTime jika hanya duration yang berubah
        endTime = new Date(existingSchedule.time);
        endTime.setHours(endTime.getHours() + parseInt(duration));
      }

      const schedule = await prisma.schedule.update({
        where: { id: Number(id) },
        data: {
          ...(date && { date: new Date(date) }),
          ...(time && { time: formattedTime }),
          endTime,
          ...(location && { location }),
          ...(duration && { duration: parseInt(duration) }),
          ...(note && { note }),
        },
      });

      // Format response
      const hours = schedule.time.getHours();
      const minutes = schedule.time.getMinutes().toString().padStart(2, "0");

      const formattedSchedule = {
        ...schedule,
        date: schedule.date.toISOString().split("T")[0],
        time: `${hours}.${minutes}`,
        endTime: `${(hours + schedule.duration)
          .toString()
          .padStart(2, "0")}.${minutes}`,
        createdAt: formatDateTimeWIB(schedule.createdAt),
      };

      res.json({
        status: true,
        message: "Schedule updated successfully",
        data: formattedSchedule,
      });
    } catch (error) {
      next(error);
    }
  },

  destroy: async (req, res, next) => {
    try {
      const { id } = req.params;

      // Cek schedule exists
      const existingSchedule = await prisma.schedule.findUnique({
        where: { id: Number(id) },
      });

      if (!existingSchedule) {
        return res.status(404).json({
          status: false,
          message: "Schedule not found",
          data: null,
        });
      }

      // Delete schedule
      await prisma.schedule.delete({
        where: { id: Number(id) },
      });

      res.json({
        status: true,
        message: "Schedule deleted successfully",
        data: null,
      });
    } catch (error) {
      next(error);
    }
  },
};
