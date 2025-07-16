const { utcTimePlus7 } = require("../../utils/formattedDate");

const discountCodes = [
  {
    code: "DISCOUNT5",
    percentage: 5,
    status: true,
    createdAt: utcTimePlus7().toISOString(),
    updatedAt: utcTimePlus7().toISOString(),
  },
  {
    code: "DISCOUNT15",
    percentage: 15,
    status: true,
    createdAt: utcTimePlus7().toISOString(),
    updatedAt: utcTimePlus7().toISOString(),
  },
  {
    code: "DISCOUNT30",
    percentage: 30,
    status: true,
    createdAt: utcTimePlus7().toISOString(),
    updatedAt: utcTimePlus7().toISOString(),
  },
  {
    code: "SOBATCAHAYA",
    percentage: 10,
    status: true,
    createdAt: utcTimePlus7().toISOString(),
    updatedAt: utcTimePlus7().toISOString(),
  },
];

async function discount(prisma) {
  try {
    // Hapus semua kode diskon yang ada
    await prisma.discountCode.deleteMany();

    // Buat beberapa kode diskon baru
    for (const discount of discountCodes) {
      const createdDiscount = await prisma.discountCode.create({
        data: discount,
      });
    }
    console.log("Discount data seeded successfully");
  } catch (error) {
    console.error("Error seeding discount:", error);
    throw error; // Re-throw error untuk proper error handling
  }
}

module.exports = discount;
