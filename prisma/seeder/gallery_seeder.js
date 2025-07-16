const fs = require("fs");
const path = require("path");
const { utcTimePlus7 } = require("../../utils/formattedDate");

async function galleries(prisma) {
  try {
    // Menggunakan path.join untuk mendapatkan path yang benar
    const filePath = path.join(
      __dirname,
      "../../assets/gallery_seed_data.json"
    );
    const rawData = fs.readFileSync(filePath);
    const data = JSON.parse(rawData);

    // Tambahkan createdAt dengan waktu WIB untuk setiap item
    const galleriesWithDate = data.flatMap((gallery) => {
      const images = gallery.image.split(", "); // Memisahkan URL gambar menjadi array
      return images.map((image) => ({
        category: gallery.category,
        createdAt: utcTimePlus7().toISOString(),
        image: image.trim(), // Menghapus spasi tambahan
      }));
    });

    await prisma.gallery.createMany({
      data: galleriesWithDate,
    });

    console.log("Gallery data seeded successfully");
  } catch (error) {
    console.error("Error seeding galleries:", error);
    throw error;
  }
}

module.exports = galleries;
