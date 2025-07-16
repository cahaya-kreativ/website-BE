const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const midtransClient = require("midtrans-client");
const {
  PAYMENT_DEV_CLIENT_KEY,
  PAYMENT_DEV_SERVER_KEY,
  PAYMENT_PROD_CLIENT_KEY,
  PAYMENT_PROD_SERVER_KEY,
} = process.env;
const { utcTimePlus7, formatDateTimeWIB } = require("../utils/formattedDate");

// Setup Midtrans client
const isProduction = false;

let snap = new midtransClient.Snap({
  isProduction: isProduction,
  serverKey: isProduction ? PAYMENT_PROD_SERVER_KEY : PAYMENT_DEV_SERVER_KEY,
  clientKey: isProduction ? PAYMENT_PROD_CLIENT_KEY : PAYMENT_DEV_CLIENT_KEY,
});

module.exports = {
  index: async (req, res, next) => {
    try {
      const payments = await prisma.payment.findMany({
        include: {
          order: {
            include: {
              user: {
                select: {
                  id: true,
                  fullname: true,
                  email: true,
                  phoneNumber: true,
                },
              },
              orderDetails: {
                include: {
                  product: {
                    select: {
                      id: true,
                      name: true,
                      price: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      const formattedPayments = payments.map((payment) => ({
        ...payment,
        createdAt: formatDateTimeWIB(payment.createdAt),
        order: {
          ...payment.order,
          createdAt: formatDateTimeWIB(payment.order.createdAt),
          expired_paid: formatDateTimeWIB(payment.order.expired_paid),
        },
      }));

      res.status(200).json({
        status: true,
        message: "Get all payments success",
        data: formattedPayments,
      });
    } catch (error) {
      next(error);
    }
  },
  show: async (req, res, next) => {
    try {
      const { id } = req.params;

      const payment = await prisma.payment.findUnique({
        where: { id: Number(id) },
        include: {
          order: {
            include: {
              user: {
                select: {
                  id: true,
                  fullname: true,
                  email: true,
                  phoneNumber: true,
                },
              },
              orderDetails: {
                include: {
                  product: {
                    select: {
                      id: true,
                      name: true,
                      price: true,
                    },
                  },
                },
              },
              schedule: {
                select: {
                  id: true,
                  date: true,
                  time: true,
                  endTime: true,
                  location: true,
                  duration: true,
                },
              },
            },
          },
        },
      });

      if (!payment) {
        return res.status(404).json({
          status: false,
          message: "Payment not found",
          data: null,
        });
      }

      const formattedPayment = {
        ...payment,
        createdAt: formatDateTimeWIB(payment.createdAt),
        order: {
          ...payment.order,
          createdAt: formatDateTimeWIB(payment.order.createdAt),
          expired_paid: formatDateTimeWIB(payment.order.expired_paid),
          schedule: {
            ...payment.order.schedule,
            date: payment.order.schedule.date.toISOString().split("T")[0],
            time: payment.order.schedule.time.toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            }),
            endTime: payment.order.schedule.endTime.toLocaleTimeString(
              "en-US",
              {
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
              }
            ),
          },
        },
      };

      res.status(200).json({
        status: true,
        message: "Get payment detail success",
        data: formattedPayment,
      });
    } catch (error) {
      next(error);
    }
  },
  //

  createPayment: async (req, res, next) => {
    try {
      const { orderId } = req.params;
      if (isNaN(orderId)) {
        return res.status(400).json({
          status: false,
          message: "Invalid order ID",
        });
      }
  
      const { method_payment } = req.body;
  
      if (!["fullPayment", "downPayment"].includes(method_payment)) {
        return res.status(400).json({
          status: false,
          message: "Invalid payment method",
        });
      }
  
      const order = await prisma.order.findUnique({
        where: { id: parseInt(orderId) },
        include: {
          user: true,
          payments: true,
        },
      });
  
      if (!order) {
        return res.status(404).json({
          status: false,
          message: `Order With Id ${orderId} Not Found`,
        });
      }
  
      if (order.status === "pending") {
        return res.status(400).json({
          status: false,
          message: "Order has been pending and waiting admin approval",
        });
      }
  
      if (order.status === "done") {
        return res.status(400).json({
          status: false,
          message: "Order has already done",
        });
      }
  
      if (order.status === "cancelled") {
        return res.status(400).json({
          status: false,
          message: "Order has been cancelled and cannot be paid",
        });
      }
  
      // Cek apakah order sudah lunas (full payment)
      const isFullPaid = order.payments.some(
        (p) => p.method_payment === "fullPayment" && p.status === "paid"
      );
  
      // Cek apakah order dibuat sebagai down payment dan sudah ada DP1 lunas
      const dp1Exists = order.payments.some(
        (p) => p.payment_stage === 1 && p.status === "paid"
      );
  
      // Validasi: Jika full payment sudah lunas → tidak boleh buat apa-apa lagi
      if (isFullPaid) {
        return res.status(400).json({
          status: false,
          message: "Order already fully paid. Cannot create new payment.",
        });
      }
  
      // Validasi: Jika DP1 sudah lunas → tidak boleh buat full payment
      if (dp1Exists && method_payment === "fullPayment") {
        return res.status(400).json({
          status: false,
          message: "Order already started with Down Payment. Cannot use Full Payment now.",
        });
      }
  
      // Validasi: Jika DP1 sudah lunas → cek apakah DP2 belum lunas
      if (dp1Exists && method_payment === "downPayment") {
        const dp2Exists = order.payments.some(
          (p) => p.payment_stage === 2 && p.status === "paid"
        );
        if (dp2Exists) {
          return res.status(400).json({
            status: false,
            message: "Order already fully paid via Down Payment.",
          });
        }
      }
  
      // Helper function to generate Midtrans transaction parameter
      const createParameter = (amount, stage = null) => {
        const baseOrderId = `Order-${order.code}`;
        const suffix = stage ? `-DP${stage}` : "";
        const timestamp = utcTimePlus7().toISOString();
        const fullOrderId = `${baseOrderId}${suffix}-${timestamp}`;
  
        return {
          transaction_details: {
            order_id: fullOrderId,
            gross_amount: Math.floor(amount),
          },
          credit_card: {
            secure: true,
          },
          customer_details: {
            first_name: order.user.fullname,
            email: order.user.email,
            phone: order.user.phoneNumber,
          },
        };
      };
  
      let responsePayload = {};
  
      if (method_payment === "fullPayment") {
        const parameter = createParameter(order.total_amount);
        const transaction = await snap.createTransaction(parameter);
  
        const existingFullPayment = await prisma.payment.findFirst({
          where: { order_id: order.id, payment_stage: null },
        });
  
        if (existingFullPayment) {
          await prisma.payment.update({
            where: { id: existingFullPayment.id },
            data: {
              payment_url: transaction.redirect_url,
              status: "unpaid",
            },
          });
        } else {
          await prisma.payment.create({
            data: {
              order_id: order.id,
              payment_stage: null,
              amount: order.total_amount.toString(),
              method_payment: "fullPayment",
              payment_url: transaction.redirect_url,
              status: "unpaid",
              createdAt: utcTimePlus7().toISOString(),
            },
          });
        }
  
        await prisma.order.update({
          where: { id: order.id },
          data: {
            remaining_amount: null,
            is_paid: false,
          },
        });
  
        responsePayload = { paymentLink: transaction.redirect_url };
      } else if (method_payment === "downPayment") {
        const downPaymentAmount = Math.floor(order.total_amount / 2);
        const remaining = order.total_amount - downPaymentAmount;
  
        const [transaction1, transaction2] = await Promise.all([
          snap.createTransaction(createParameter(downPaymentAmount, 1)),
          snap.createTransaction(createParameter(downPaymentAmount, 2)),
        ]);
  
        // Upsert payment 1
        await prisma.payment.upsert({
          where: {
            order_id_payment_stage: { order_id: order.id, payment_stage: 1 },
          },
          create: {
            order_id: order.id,
            payment_stage: 1,
            amount: downPaymentAmount.toString(),
            method_payment: "downPayment",
            payment_url: transaction1.redirect_url,
            status: "unpaid",
            createdAt: utcTimePlus7().toISOString(),
          },
          update: {
            payment_url: transaction1.redirect_url,
            status: "unpaid",
          },
        });
  
        // Upsert payment 2
        await prisma.payment.upsert({
          where: {
            order_id_payment_stage: { order_id: order.id, payment_stage: 2 },
          },
          create: {
            order_id: order.id,
            payment_stage: 2,
            amount: downPaymentAmount.toString(),
            method_payment: "downPayment",
            payment_url: transaction2.redirect_url,
            status: "unpaid",
            createdAt: utcTimePlus7().toISOString(),
          },
          update: {
            payment_url: transaction2.redirect_url,
            status: "unpaid",
          },
        });
  
        // Update sisa pembayaran di order
        await prisma.order.update({
          where: { id: order.id },
          data: {
            remaining_amount: remaining,
            is_paid: false,
          },
        });
  
        responsePayload = {
          paymentLink1: transaction1.redirect_url,
          paymentLink2: transaction2.redirect_url,
        };
      }
  
      res.status(200).json({
        status: true,
        message: `${
          method_payment === "fullPayment" ? "Full Payment" : "Down Payment"
        } initiated successfully`,
        data: responsePayload,
      });
    } catch (error) {
      next(error);
    }
  },

  notificationMidtrans: async (req, res, next) => {
    try {
      const {
        order_id,
        transaction_status,
        fraud_status,
        gross_amount,
        payment_type,
      } = req.body;

      // Parsing order_code dan payment_stage
      const parts = order_id.split("-");
      const orderCode = parts[1];
      const paymentStage = parts.includes("DP1")
        ? 1
        : parts.includes("DP2")
        ? 2
        : null;

      let paymentStatus;
      let orderStatus;

      if (transaction_status === "capture") {
        if (fraud_status === "challenge") {
          paymentStatus = "unpaid";
          orderStatus = "unpaid";
        } else if (fraud_status === "accept") {
          paymentStatus = "paid";
          orderStatus = "process";
        }
      } else if (transaction_status === "settlement") {
        paymentStatus = "paid";
        orderStatus = "process";
      } else if (["cancel", "deny", "expire"].includes(transaction_status)) {
        paymentStatus = "cancelled";
        orderStatus = "cancelled";
      } else if (transaction_status === "pending") {
        paymentStatus = "unpaid";
        orderStatus = "unpaid";
      }

      const order = await prisma.order.findFirst({
        where: { code: orderCode },
      });

      if (!order) {
        return res.status(404).json({
          status: false,
          message: "Order not found",
        });
      }

      try {
        await prisma.$transaction(async (prisma) => {
          let whereClause;
          if (paymentStage) {
            const existingPayment = await prisma.payment.findFirst({
              where: { order_id: order.id, payment_stage: paymentStage },
            });
            whereClause = existingPayment
              ? { id: existingPayment.id }
              : undefined;
          } else {
            const existingFullPayment = await prisma.payment.findFirst({
              where: { order_id: order.id, payment_stage: null },
            });
            whereClause = existingFullPayment
              ? { id: existingFullPayment.id }
              : undefined;
          }

          if (whereClause) {
            await prisma.payment.update({
              where: whereClause,
              data: { status: paymentStatus },
            });
          } else {
            await prisma.payment.create({
              data: {
                order_id: order.id,
                payment_stage: paymentStage || null,
                amount: gross_amount.toString(),
                method_payment: paymentStage ? "downPayment" : "fullPayment",
                payment_url: "",
                status: paymentStatus,
                createdAt: utcTimePlus7(),
              },
            });
          }

          // Update status order & is_paid
          if (paymentStage === 1 && paymentStatus === "paid") {
            await prisma.order.update({
              where: { id: order.id },
              data: {
                status: "process",
                is_paid: false,
                remaining_amount: Math.floor(order.total_amount / 2),
              },
            });
          } else if (paymentStage === 2 && paymentStatus === "paid") {
            await prisma.order.update({
              where: { id: order.id },
              data: {
                status: "process",
                is_paid: true,
                remaining_amount: null,
              },
            });
          } else if (!paymentStage && paymentStatus === "paid") {
            await prisma.order.update({
              where: { id: order.id },
              data: {
                status: "process",
                is_paid: true,
                remaining_amount: null,
              },
            });
          } else if (paymentStatus === "cancelled") {
            await prisma.order.update({
              where: { id: order.id },
              data: {
                status: "cancelled",
                is_paid: false,
                remaining_amount: null,
              },
            });
          }

          // Notifikasi
          await prisma.notification.create({
            data: {
              title: `Payment ${
                paymentStatus.charAt(0).toUpperCase() + paymentStatus.slice(1)
              }`,
              message: `Payment status for order ${orderCode} is ${paymentStatus}${
                paymentStage ? ` (DP${paymentStage})` : ""
              }`,
              createdAt: utcTimePlus7(),
              user: { connect: { id: order.user_id } },
            },
          });
        });

        return res.status(200).json({ status: true, message: "OK" });
      } catch (error) {
        console.error("Transaction error:", error);
        return res
          .status(500)
          .json({ status: false, message: "Error processing payment" });
      }
    } catch (error) {
      console.error("Notification error:", error);
      return res
        .status(500)
        .json({ status: false, message: "Internal server error" });
    }
  },
};
