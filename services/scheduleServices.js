const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { formatSchedule } = require("../utils/scheduleFormatter");

const updateFromOrder = async (scheduleId, orderId) => {
  try {
    // Pastikan schedule ada sebelum update
    const schedule = await prisma.schedule.findUnique({
      where: { id: Number(scheduleId) },
    });

    if (!schedule) {
      throw new Error("Schedule not found");
    }

    const updatedSchedule = await prisma.schedule.update({
      where: {
        id: Number(scheduleId),
      },
      data: {
        isBooked: true,
        orders: {
          connect: {
            id: Number(orderId),
          },
        },
      },
    });

    return formatSchedule(updatedSchedule);
  } catch (error) {
    throw error;
  }
};

module.exports = { updateFromOrder };
