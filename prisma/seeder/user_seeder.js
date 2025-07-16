const { Role } = require("@prisma/client");
const bcrypt = require("bcrypt");

async function userAdmin(prisma) {
  try {
    const encryptedPassword = await bcrypt.hash("Admin123*", 10);

    await prisma.user.upsert({
      where: { email: "cahayakreativ8@gmail.com" },
      update: {},
      create: {
        fullname: "Cahaya Kreativ",
        email: "cahayakreativ8@gmail.com",
        phoneNumber: "08123456789",
        password: encryptedPassword,
        isVerified: true,
        role: Role.admin,
        profile: {
          create: {
            address: "Jl. Jambu V, Pondok Tjandra",
            city: "Sidoarjo",
            province: "Jawa Timur",
            postal_code: "61256",
          },
        },
      },
    });

    console.log("Admin data seeded successfully");
  } catch (error) {
    console.error("Error seeding admin:", error);
    throw error; // Re-throw error untuk proper error handling
  }
}

module.exports = userAdmin;
