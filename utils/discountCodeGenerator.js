const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

/**
 * Fungsi untuk menghasilkan kode diskon acak.
 * @returns {string} - Kode diskon yang dihasilkan.
 */
const generateDiscountCode = () => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
};

/**
 * Fungsi untuk menambahkan kode diskon baru ke database.
 * @param {string} code - Kode diskon yang akan ditambahkan.
 * @param {number} percentage - Persentase diskon.
 */
const addDiscountCode = async (code, percentage) => {
  await prisma.discountCode.create({
    data: {
      code,
      percentage,
    },
  });
};

/**
 * Fungsi untuk memvalidasi kode diskon dan mengembalikan persentase diskon.
 * @param {string} code - Kode diskon yang dimasukkan oleh pengguna.
 * @returns {number} - Persentase diskon atau 0 jika tidak valid.
 */
const validateDiscountCode = async (code) => {
  if (!code) return 0; // Jika tidak ada kode, kembalikan 0
  const discount = await prisma.discountCode.findUnique({
    where: { code },
  });
  return discount ? discount.percentage : 0; // Mengembalikan persentase diskon atau 0 jika tidak ditemukan
};

module.exports = { generateDiscountCode, addDiscountCode, validateDiscountCode };