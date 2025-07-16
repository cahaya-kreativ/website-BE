const fs = require("fs");
const path = require("path");
const { utcTimePlus7 } = require("../../utils/formattedDate");

async function categories(prisma) {
  try {
    // Menggunakan path.join untuk mendapatkan path yang benar
    const filePath = path.join(
      __dirname,
      "../../assets/category_seed_data.json"
    );
    const rawData = fs.readFileSync(filePath);
    const data = JSON.parse(rawData);

    // Tambahkan createdAt dengan waktu WIB untuk setiap item
    const categoriesWithDate = data.map((category) => ({
      ...category,
      createdAt: utcTimePlus7().toISOString(),
    }));

    await prisma.category.createMany({
      data: categoriesWithDate,
    });

    console.log("Category data seeded successfully");
  } catch (error) {
    console.error("Error seeding categories:", error);
    throw error;
  }
}

module.exports = categories;
