const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const userAdmin = require("./seeder/user_seeder");
const categories = require("./seeder/category_seeder");
const product = require("./seeder/product_seeder");
const portfolio = require("./seeder/portofolio_seeder");
const discount = require("./seeder/discount_seeder");
const gallery = require("./seeder/gallery_seeder");

async function main() {
  // Run seeders
  await userAdmin(prisma);
  await categories(prisma);
  await product(prisma);
  await portfolio(prisma);
  await discount(prisma);
  await gallery(prisma);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
