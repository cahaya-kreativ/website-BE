const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { utcTimePlus7, formatDateTimeWIB } = require("../utils/formattedDate");

module.exports = {
  applyDiscount: async (req, res, next) => {
    try {
      const { code, subtotal } = req.body; // Mengambil code dan subtotal dari request body

      // Cek apakah kode diskon valid
      const discount = await prisma.discountCode.findUnique({
        where: { code: code }, // Menggunakan findUnique dengan benar
      });

      if (!discount) {
        return res.status(400).json({
          status: false,
          message: "Invalid discount code",
          data: null,
        });
      }

      if (!discount.status) {
        return res.status(400).json({
          status: false,
          message: "Expired discount code",
          data: null,
        });
      }

      // Hitung jumlah diskon
      const discountAmount = (subtotal * discount.percentage) / 100;

      // Hitung total setelah diskon
      const totalAmount = subtotal - discountAmount;

      res.status(200).json({
        status: true,
        message: "Redeem Discount successfully",
        data: {
          discountAmount,
          totalAmount,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  getDiscounts: async (req, res, next) => {
    try {
      const discounts = await prisma.discountCode.findMany();
      res.status(200).json({
        status: true,
        message: "Discounts retrieved successfully",
        data: discounts,
      });
    } catch (error) {
      next(error);
    }
  },

  // Membuat diskon baru
  createDiscount: async (req, res, next) => {
    try {
      const { code, percentage } = req.body;

      // Validasi input
      if (!code) {
        return res.status(400).json({
          status: false,
          message: "Code is required",
          data: null,
        });
      }

      if (!percentage) {
        return res.status(400).json({
          status: false,
          message: "Percentage is required",
          data: null,
        });
      }

      if (percentage < 0 || percentage > 100) {
        return res.status(400).json({
          status: false,
          message: "Percentage must be between 1-100%",
          data: null,
        });
      }

      // Cek apakah kode diskon sudah ada
      const existingDiscount = await prisma.discountCode.findUnique({
        where: { code },
      });

      if (existingDiscount) {
        return res.status(400).json({
          status: false,
          message: "Discount code already exists",
          data: null,
        });
      }

      const discount = await prisma.discountCode.create({
        data: {
          code,
          percentage,
          createdAt: new Date(utcTimePlus7()),
          updatedAt: new Date(utcTimePlus7()),
        },
      });

      res.status(201).json({
        status: true,
        message: "Discount created successfully",
        data: discount,
      });
    } catch (error) {
      next(error);
    }
  },

  // Memperbarui diskon
  updateDiscount: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { code, percentage, status } = req.body;

      // Validasi ID
      if (!id || isNaN(id)) {
        return res.status(400).json({
          status: false,
          message: "Invalid discount ID",
          data: null,
        });
      }

      if (percentage < 0 || percentage > 100) {
        return res.status(400).json({
          status: false,
          message: "Percentage must be between 1-100%",
          data: null,
        });
      }

      // Cek apakah diskon ada
      const existingDiscount = await prisma.discountCode.findUnique({
        where: { id: Number(id) },
      });

      if (!existingDiscount) {
        return res.status(404).json({
          status: false,
          message: "Discount not found",
          data: null,
        });
      }

      const updatedDiscount = await prisma.discountCode.update({
        where: { id: Number(id) },
        data: {
          code: code || existingDiscount.code,
          percentage: percentage || existingDiscount.percentage,
          status: status !== undefined ? status : existingDiscount.status,
          updatedAt: new Date(utcTimePlus7()),
        },
      });

      res.status(200).json({
        status: true,
        message: "Discount updated successfully",
        data: updatedDiscount,
      });
    } catch (error) {
      next(error);
    }
  },

  // Menghapus diskon
  deleteDiscount: async (req, res, next) => {
    try {
      const { id } = req.params;

      // Validasi ID
      if (!id || isNaN(id)) {
        return res.status(400).json({
          status: false,
          message: "Invalid discount ID",
          data: null,
        });
      }

      // Cek apakah diskon ada
      const existingDiscount = await prisma.discountCode.findUnique({
        where: { id: Number(id) },
      });

      if (!existingDiscount) {
        return res.status(404).json({
          status: false,
          message: "Discount not found",
          data: null,
        });
      }

      await prisma.discountCode.delete({
        where: { id: Number(id) },
      });

      res.status(200).json({
        status: true,
        message: "Discount deleted successfully",
      });
    } catch (error) {
      next(error);
    }
  },
};
