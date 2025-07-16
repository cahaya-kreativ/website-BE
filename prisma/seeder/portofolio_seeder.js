// path=prisma/seeder/portofolio_seeder.js
const fs = require("fs");
const path = require("path");
const { utcTimePlus7 } = require("../../utils/formattedDate");

async function portfolio(prisma) {
  try {
    // Menggunakan path.join untuk mendapatkan path yang benar
    const filePath = path.join(
      __dirname,
      "../../assets/portofolio_seed_data.json"
    );
    const rawData = fs.readFileSync(filePath);
    const data = JSON.parse(rawData);

    // Tambahkan createdAt dengan waktu WIB untuk setiap item
    const portfolioWithDate = data.map((portfolio) => ({
      title: portfolio.title,
      description: portfolio.description,
      product_id: parseInt(portfolio.product_id), // Pastikan product_id adalah integer
      createdAt: utcTimePlus7().toISOString(),
    }));

    // Buat portfolio tanpa media
    await prisma.portfolio.createMany({
      data: portfolioWithDate,
    });

    console.log("Portfolio data seeded successfully");

    // Setelah portfolio dibuat, buat media secara terpisah
    for (const portfolio of data) {
      const portfolioEntry = await prisma.portfolio.findFirst({
        where: {
          title: portfolio.title,
          description: portfolio.description,
          product_id: parseInt(portfolio.product_id),
        },
      });

      // Cek apakah portfolioEntry ditemukan
      if (!portfolioEntry) {
        console.error(`Portfolio entry not found for title: ${portfolio.title}, product_id: ${portfolio.product_id}`);
        continue; // Lewati iterasi ini jika tidak ditemukan
      }

      // Pisahkan media menjadi array
      const mediaUrls = portfolio.media.split(",").map((url) => url.trim());

      // Buat media untuk setiap portfolio
      await Promise.all(
        mediaUrls.map((url) => {
          // Tentukan tipe berdasarkan ekstensi
          const type = url.endsWith(".mp4") || url.endsWith(".mov") || url.endsWith(".mpeg") ? "VIDEO" : "IMAGE";

          return prisma.portfolioMedia.create({
            data: {
              url: url,
              type: type, // Gunakan tipe yang telah ditentukan
              portfolio_id: portfolioEntry.id, // Hubungkan media dengan portfolio
              createdAt: utcTimePlus7(),
            },
          });
        })
      );
    }
  } catch (error) {
    console.error("Error seeding portfolio:", error);
    throw error;
  }
}

module.exports = portfolio;
