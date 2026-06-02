const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { utcTimePlus7 } = require("./utils/formattedDate");

async function main() {
  try {
    const now = utcTimePlus7().toISOString();

    console.log("Menambahkan kategori 'IT Inovasi dan Solusi'...");
    let category = await prisma.category.findFirst({
      where: { name: "IT Inovasi dan Solusi" },
    });

    if (!category) {
      category = await prisma.category.create({
        data: {
          name: "IT Inovasi dan Solusi",
          description: "Layanan pembuatan website company profile, aplikasi custom, ERP, dan Warehouse Management System untuk mendigitalisasi bisnis Anda.",
          image: "/src/assets/img/IT/it_category.png",
          createdAt: now,
        },
      });
      console.log("Kategori berhasil ditambahkan:", category.id);
    } else {
      console.log("Kategori sudah ada, memperbarui gambar...");
      await prisma.category.update({
        where: { id: category.id },
        data: { image: "/src/assets/img/IT/it_category.png" }
      });
    }

    console.log("Menambahkan produk 'Pembuatan Website Company Profile'...");
    let product1 = await prisma.product.findFirst({
      where: { name: "Pembuatan Website Company Profile" },
    });
    if (!product1) {
      await prisma.product.create({
        data: {
          name: "Pembuatan Website Company Profile",
          label: "Basic Web Profile",
          description: "Layanan pembuatan website company profile responsif dan modern untuk meningkatkan kredibilitas bisnis Anda di dunia digital.",
          detail: "Desain UI/UX Eksklusif, 5 Halaman Utama, Integrasi WhatsApp, SEO Basic, Free Domain & Hosting 1 Tahun, Garansi Maintenance 3 Bulan",
          image: "/src/assets/img/IT/it_web.png",
          price: "3500000",
          duration: 720,
          category_id: category.id,
          createdAt: now,
        }
      });
      console.log("Produk 1 ditambahkan.");
    } else {
      await prisma.product.update({
        where: { id: product1.id },
        data: { image: "/src/assets/img/IT/it_web.png" }
      });
    }

    console.log("Menambahkan produk 'Custom Software / ERP System'...");
    let product2 = await prisma.product.findFirst({
      where: { name: "Custom Software / ERP System" },
    });
    if (!product2) {
      await prisma.product.create({
        data: {
          name: "Custom Software / ERP System",
          label: "Enterprise Solution",
          description: "Sistem ERP dan Warehouse Management System (WMS) yang dirancang khusus untuk memenuhi alur kerja dan kebutuhan perusahaan Anda.",
          detail: "Sistem Cloud-Based, Modul Inventory & Finance, Multi-user Role Access, Real-time Dashboard, Training Karyawan, Garansi Maintenance 6 Bulan",
          image: "/src/assets/img/IT/it_erp.png",
          price: "15000000",
          duration: 720,
          category_id: category.id,
          createdAt: now,
        }
      });
      console.log("Produk 2 ditambahkan.");
    } else {
      await prisma.product.update({
        where: { id: product2.id },
        data: { image: "/src/assets/img/IT/it_erp.png" }
      });
    }

    console.log("Menambahkan gallery portfolio...");
    let gallery = await prisma.gallery.findFirst({
      where: { category: "it_solution" },
    });
    if (!gallery) {
      await prisma.gallery.create({
        data: {
          image: "/src/assets/img/IT/it_web.png, /src/assets/img/IT/it_erp.png",
          category: "it_solution",
          createdAt: now,
        }
      });
      console.log("Gallery ditambahkan.");
    } else {
      await prisma.gallery.update({
        where: { id: gallery.id },
        data: { image: "/src/assets/img/IT/it_web.png, /src/assets/img/IT/it_erp.png" }
      });
    }

    console.log("Proses selesai.");
  } catch (error) {
    console.error("Terjadi kesalahan:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
