const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { utcTimePlus7 } = require("../utils/formattedDate");

const updateDate = async () => {
    try {
      const now = new Date(utcTimePlus7()); // Pastikan utcTimePlus7 sudah didefinisikan
  
      const result = await prisma.order.updateMany({
        where: {
          status: {
            in: ["unpaid"],
          },
          expired_paid: {
            lt: now,
          },
        },
        data: {
          status: "cancelled",
        },
      });
    //   console.log(
    //     `[${new Date().toISOString()}] Successfully updated ${result.count} order(s) to 'cancelled' status.`
    //   );
  
      return {
        success: true,
        count: result.count,
        message: `${result.count} order(s) have been updated to cancelled status.`,
      };
    } catch (error) {
      console.error("Error updating expired orders:", error);
      return {
        success: false,
        message: "Failed to update expired orders.",
        error: error.message,
      };
    }
  };
  
  module.exports = updateDate;