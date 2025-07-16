const fs = require("fs");
const path = require("path");
const { utcTimePlus7 } = require("../../utils/formattedDate");
const { Decimal } = require("@prisma/client");

async function product(prisma) {
  try {
    // Menggunakan path.join untuk mendapatkan path yang benar
    const filePath = path.join(
      __dirname,
      "../../assets/product_seed_data.json"
    );
    const rawData = fs.readFileSync(filePath);
    const data = JSON.parse(rawData);

    // Format data sebelum insert
    const productWithDate = data.map((product) => ({
      ...product,
      // Bersihkan format harga dari titik dan konversi ke Decimal
      price: new Decimal(product.price.replace(/\./g, "")),
      // Convert duration ke number
      duration: parseInt(product.duration),
      // Convert category_id ke number
      category_id: parseInt(product.category_id),
      createdAt: utcTimePlus7().toISOString(),
    }));

    await prisma.product.createMany({
      data: productWithDate,
    });

    console.log("Product data seeded successfully");
  } catch (error) {
    console.error("Error seeding products:", error);
    throw error;
  }
}

module.exports = product;
