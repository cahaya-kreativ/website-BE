const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { Role } = require("@prisma/client");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { formatDateTimeToUTC } = require("../utils/formattedDate");
const { utcTimePlus7, formatDateTimeWIB } = require("../utils/formattedDate");

module.exports = {
  loginAdmin: async (req, res, next) => {
    try {
      const { emailOrPhoneNumber, password } = req.body;

      const user = await prisma.user.findFirst({
        where: {
          OR: [
            { email: emailOrPhoneNumber },
            { phoneNumber: emailOrPhoneNumber },
          ],
        },
      });

      // Return error if user not found
      if (!user) {
        return res.status(400).json({
          status: false,
          message: "invalid email or password",
          data: null,
        });
      }

      // Allow only admin, employee, and superAdmin roles
      if (!["admin", "employee", "superAdmin"].includes(user.role)) {
        return res.status(403).json({
          status: false,
          message:
            "Access denied. Only admins, employees, and super admins can log in.",
          data: null,
        });
      }

      // Check if the provided password is correct
      let isPasswordCorrect = await bcrypt.compare(password, user.password);
      if (!isPasswordCorrect) {
        return res.status(400).json({
          status: false,
          message: "invalid email or password",
          data: null,
        });
      }

      // Return error if the user account is not verified
      if (!user.isVerified) {
        return res.status(403).json({
          status: false,
          message: "Account not verified. Please check your email or spam!",
          data: null,
        });
      }

      const tokenPayload = {
        id: user.id,
        email: user.email,
        role: user.role,
      };

      // Pastikan JWT_SECRET_KEY ada dan valid
      if (!process.env.JWT_SECRET_KEY) {
        throw new Error("JWT_SECRET_KEY is not configured");
      }

      const token = jwt.sign(tokenPayload, process.env.JWT_SECRET_KEY);

      delete user.password;
      user.otpCreatedAt = formatDateTimeToUTC(user.otpCreatedAt);

      return res.status(201).json({
        status: true,
        message: "success",
        data: { ...user, token },
      });
    } catch (error) {
      console.error("Login error:", error);
      next(error);
    }
  },

  addEmployee: async (req, res, next) => {
    try {
      const { fullname, email, phoneNumber, password, role } = req.body;

      const passwordValidator =
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*.])[A-Za-z\d!@#$%^&*.]{8,50}$/;
      const emailValidator = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      // Check for existing user with the same email
      const exist = await prisma.user.findUnique({
        where: { email },
      });

      if (exist) {
        return res.status(401).json({
          status: false,
          message: "Email already used!",
        });
      }

      // Validasi input
      if (!fullname) {
        return res.status(400).json({
          status: false,
          message: "Name are required.",
          data: null,
        });
      }

      if (!email) {
        return res.status(400).json({
          status: false,
          message: "Email fields are required.",
          data: null,
        });
      }

      if (!emailValidator.test(email)) {
        return res.status(400).json({
          status: false,
          message: "Invalid email format.",
          data: null,
        });
      }

      if (!phoneNumber) {
        return res.status(400).json({
          status: false,
          message: "Phone Number fields are required.",
          data: null,
        });
      }

      if (!/^\d+$/.test(phoneNumber)) {
        return res.status(400).json({
          status: false,
          message:
            "Invalid phone number format. It must contain only numeric characters.",
          data: null,
        });
      }

      if (phoneNumber.length < 10 || phoneNumber.length > 15) {
        return res.status(400).json({
          status: false,
          message:
            "Invalid phone number length. It must be between 10 and 15 characters.",
          data: null,
        });
      }

      if (!password) {
        return res.status(400).json({
          status: false,
          message: "Password fields are required.",
          data: null,
        });
      }

      if (!passwordValidator.test(password)) {
        return res.status(400).json({
          status: false,
          message:
            "Invalid password format. It must contain at least 1 lowercase, 1 uppercase, 1 digit number, 1 symbol, and minimum 8 characters long.",
          data: null,
        });
      }

      // Validasi role (harus "admin" atau "employee")
      if (!role || ![Role.admin, Role.employee].includes(role)) {
        return res.status(400).json({
          status: false,
          message: "Invalid role. Must be either 'admin' or 'employee'.",
          data: null,
        });
      }

      // Enkripsi password
      const encryptedPassword = await bcrypt.hash(password, 10);

      // Tambahkan pengguna baru
      const addEmployee = await prisma.user.create({
        data: {
          fullname,
          email,
          phoneNumber,
          password: encryptedPassword,
          isVerified: true,
          role,
        },
      });
      delete addEmployee.password;

      res.status(201).json({
        status: true,
        message: "Employee added successfully",
        data: addEmployee,
      });
    } catch (error) {
      next(error);
    }
  },

  updatePassword: async (req, res, next) => {
    try {
      // Check if user is authenticated
      if (!req.user) {
        return res.status(401).json({
          status: false,
          message: "Unauthorized, please login first",
          data: null,
        });
      }

      const { oldPassword, newPassword, newPasswordConfirmation } = req.body;

      // Check if required parameters are provided
      if (!oldPassword || !newPassword || !newPasswordConfirmation) {
        return res.status(400).json({
          status: false,
          message: "All fields must be provided",
          data: null,
        });
      }

      const userId = req.user.id;

      // Fetch the current user with profile
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      // Check if user exists and has password (not Google OAuth user)
      if (!user) {
        return res.status(400).json({
          status: false,
          message: "User not found",
          data: null,
        });
      }

      // Check if the old password provided matches the user's current hashed password
      let isOldPasswordCorrect = await bcrypt.compare(
        oldPassword,
        user.password
      );
      if (!isOldPasswordCorrect) {
        return res.status(401).json({
          status: false,
          message: "Incorrect old password",
          data: null,
        });
      }

      // Validate the format of the new password using a regular expression
      const passwordValidator =
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*.])[A-Za-z\d!@#$%^&*.]{8,12}$/;

      if (!passwordValidator.test(newPassword)) {
        return res.status(400).json({
          status: false,
          message:
            "Invalid password format. It must contain at least 1 lowercase, 1 uppercase, 1 digit number, 1 symbol, and be between 8 and 12 characters long.",
          data: null,
        });
      }

      // Check if the new password matches the password confirmation
      if (newPassword !== newPasswordConfirmation) {
        return res.status(400).json({
          status: false,
          message: "New password and password confirmation do not match",
          data: null,
        });
      }

      // Check if new password is different from old password
      if (oldPassword === newPassword) {
        return res.status(400).json({
          status: false,
          message: "New password must be different from old password",
          data: null,
        });
      }

      // Hash the new password
      let encryptedNewPassword = await bcrypt.hash(newPassword, 10);

      // Update user's password in the database and get updated user with profile
      const updatedPassword = await prisma.$transaction(async (prisma) => {
        // Update password
        await prisma.user.update({
          where: { id: userId },
          data: { password: encryptedNewPassword },
        });

        // Get updated user with profile
        return prisma.user.findUnique({
          where: { id: userId },
        });
      });

      // Remove sensitive data
      delete updatedPassword.password;

      res.status(200).json({
        status: true,
        message: "Your password has been successfully updated!",
        data: updatedPassword,
      });
    } catch (err) {
      next(err);
    }
  },

  // Hitung total customer (user) dengan role 'user'
  countCustomers: async (req, res, next) => {
    try {
      const totalCustomers = await prisma.user.count({
        where: {
          role: "user", // Hanya menghitung pengguna dengan role 'user'
        },
      });
      return res.status(200).json({
        status: true,
        message: "Total customers retrieved successfully",
        data: totalCustomers,
      });
    } catch (error) {
      console.error("Error counting customers:", error);
      next(error);
    }
  },

  // Hitung total orders
  countOrders: async (req, res, next) => {
    try {
      const totalOrders = await prisma.order.count();
      return res.status(200).json({
        status: true,
        message: "Total orders retrieved successfully",
        data: totalOrders,
      });
    } catch (error) {
      console.error("Error counting orders:", error);
      next(error);
    }
  },

  // Hitung total products
  countProducts: async (req, res, next) => {
    try {
      const totalProducts = await prisma.product.count();
      return res.status(200).json({
        status: true,
        message: "Total products retrieved successfully",
        data: totalProducts,
      });
    } catch (error) {
      console.error("Error counting products:", error);
      next(error);
    }
  },

  // Hitung total categories
  countCategories: async (req, res, next) => {
    try {
      const totalCategories = await prisma.category.count();
      return res.status(200).json({
        status: true,
        message: "Total categories retrieved successfully",
        data: totalCategories,
      });
    } catch (error) {
      console.error("Error counting categories:", error);
      next(error);
    }
  },

  getCategoriesWithCounts: async (req, res, next) => {
    try {
      const categories = await prisma.category.findMany({
        include: {
          products: true, // Sertakan produk untuk menghitung jumlah
        },
      });

      const categoriesWithCounts = await Promise.all(
        categories.map(async (category) => {
          const productCount = category.products.length; // Hitung jumlah produk

          // Hitung jumlah pesanan yang terkait dengan kategori ini
          const orderCount = await prisma.order.count({
            where: {
              orderDetails: {
                some: {
                  product: {
                    category_id: category.id,
                  },
                },
              },
            },
          });

          return {
            id: category.id,
            name: category.name,
            description: category.description,
            image: category.image,
            totalProducts: productCount,
            totalOrders: orderCount,
          };
        })
      );

      res.json({
        status: true,
        message: "Get categories with product and order counts success",
        data: categoriesWithCounts,
      });
    } catch (error) {
      console.error("Error getting categories with counts:", error);
      next(error);
    }
  },

  getAllOrders: async (req, res, next) => {
    try {
      const orders = await prisma.order.findMany({
        include: {
          user: {
            select: {
              id: true,
              fullname: true,
              email: true,
            },
          },
          orderDetails: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  price: true,
                  label: true,
                  duration: true,
                },
              },
            },
          },
          payments: {
            // Menyertakan informasi pembayaran
            select: {
              id: true,
              amount: true,
              method_payment: true,
              status: true,
              createdAt: true,
            },
          },
          schedule: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      const formattedOrders = orders.map((order) => ({
        ...order,
        createdAt: formatDateTimeWIB(order.createdAt), // Format createdAt
        expired_paid: formatDateTimeWIB(order.expired_paid), // Format expired_paid
        payments: order.payments.map((payment) => ({
          ...payment,
          createdAt: formatDateTimeWIB(payment.createdAt), // Format createdAt untuk payments
        })),
        schedule: order.schedule
          ? {
              ...order.schedule,
              createdAt: formatDateTimeWIB(order.schedule.createdAt), // Format createdAt untuk schedule
              date: order.schedule.date.toISOString().split("T")[0], // Format date
              time: `${order.schedule.time.getHours()}.${order.schedule.time
                .getMinutes()
                .toString()
                .padStart(2, "0")}`, // Format time
              endDate: order.schedule.endDate.toISOString().split("T")[0], // Format endDate
              endTime: `${order.schedule.endTime.getHours()}.${order.schedule.endTime
                .getMinutes()
                .toString()
                .padStart(2, "0")}`, // Format endTime
            }
          : null, // Set schedule menjadi null jika tidak ada
      }));

      res.status(200).json({
        status: true,
        message: "All orders retrieved successfully",
        data: formattedOrders,
      });
    } catch (error) {
      console.error("Error getting orders:", error);
      next(error);
    }
  },

  getAllUsers: async (req, res, next) => {
    try {
      const users = await prisma.user.findMany({
        where: {
          role: "user",
        },
        select: {
          id: true,
          fullname: true,
          email: true,
          phoneNumber: true,
          profile: {
            select: {
              avatar_url: true,
              address: true,
              city: true,
              province: true,
            },
          },
        },
      });

      res.status(200).json({
        status: true,
        message: "All users retrieved successfully",
        data: users,
      });
    } catch (error) {
      console.error("Error getting users:", error);
      next(error);
    }
  },
  getAllEmployee: async (req, res, next) => {
    try {
      const employees = await prisma.user.findMany({
        where: {
          role: {
            in: ["employee", "admin"], // menangkap employee dan admin
          },
        },
        select: {
          id: true,
          fullname: true,
          email: true,
          phoneNumber: true,
          role: true,
        },
      });

      res.status(200).json({
        status: true,
        message: "All employee retrieved successfully",
        data: employees,
      });
    } catch (error) {
      console.error("Error getting employees:", error);
      next(error);
    }
  },

  editEmployee: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { fullname, email, phoneNumber } = req.body;
      const emailValidator = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      // Validasi ID
      if (!id || isNaN(id)) {
        return res.status(400).json({
          status: false,
          message: "Invalid Employee ID",
          data: null,
        });
      }

      const employeeId = Number(id);

      // Cek apakah user dengan ID tersebut ada
      const existingUser = await prisma.user.findUnique({
        where: { id: employeeId },
      });

      if (!existingUser) {
        return res.status(404).json({
          status: false,
          message: "Employee not found",
          data: null,
        });
      }

      // Validasi email jika dikirim dan berbeda dengan sebelumnya
      if (email && email !== existingUser.email) {
        const emailTaken = await prisma.user.findFirst({
          where: {
            email,
            NOT: { id: employeeId }, // pastikan bukan milik user yang sedang diupdate
          },
        });

        if (emailTaken) {
          return res.status(409).json({
            status: false,
            message: "Email already in use by another employee",
            data: null,
          });
        }
      }

      // Validate phone number format
      if (phoneNumber && !/^\d+$/.test(phoneNumber)) {
        return res.status(400).json({
          status: false,
          message:
            "Invalid phone number format. It must contain only numeric characters.",
          data: null,
        });
      }

      if (!emailValidator.test(email)) {
        return res.status(400).json({
          status: false,
          message: "Invalid email format.",
          data: null,
        });
      }

      // Bangun objek update
      const updatedData = {};
      if (fullname !== undefined) updatedData.fullname = fullname;
      if (email !== undefined) updatedData.email = email;
      if (phoneNumber !== undefined) updatedData.phoneNumber = phoneNumber;

      // Cek apakah ada data yang dikirim
      if (Object.keys(updatedData).length === 0) {
        return res.status(400).json({
          status: false,
          message: "No data provided for update",
          data: null,
        });
      }

      // Update user
      const updatedUser = await prisma.user.update({
        where: { id: employeeId },
        data: updatedData,
      });

      return res.status(200).json({
        status: true,
        message: "Employee updated successfully",
        data: updatedUser,
      });
    } catch (error) {
      next(error);
    }
  },

  deleteEmployee: async (req, res, next) => {
    try {
      const { id } = req.params; // Ambil ID dari parameter

      // Validasi ID
      if (!id || isNaN(id)) {
        return res.status(400).json({
          status: false,
          message: "Invalid Employee ID",
          data: null,
        });
      }

      // Cek apakah user dengan ID tersebut ada
      const existingUser = await prisma.user.findUnique({
        where: { id: Number(id) },
      });

      if (!existingUser) {
        return res.status(404).json({
          status: false,
          message: "Employee Not Found",
          data: null,
        });
      }

      // Hapus user
      await prisma.user.delete({
        where: { id: Number(id) },
      });

      return res.status(200).json({
        status: true,
        message: "Deleted Employee Successfully",
      });
    } catch (error) {
      next(error);
    }
  },
};
