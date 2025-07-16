const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

module.exports = {
  restrict: async (req, res, next) => {
    try {
      const { authorization } = req.headers;

      if (!authorization || !authorization.split(" ")[1]) {
        return res.status(403).json({
          status: false,
          message: "Token not provided!",
          data: null,
        });
      }

      // Pastikan JWT_SECRET_KEY ada
      if (!process.env.JWT_SECRET_KEY) {
        throw new Error("JWT_SECRET_KEY is not configured");
      }

      let token = authorization.split(" ")[1];

      // Gunakan process.env.JWT_SECRET_KEY langsung
      const decodedToken = jwt.verify(token, process.env.JWT_SECRET_KEY);

      try {
        // Ambil data user lengkap dari database
        const user = await prisma.user.findUnique({
          where: { id: decodedToken.id },
          select: {
            id: true,
            fullname: true,
            email: true,
            phoneNumber: true,
            role: true, // Pastikan role diambil
            isVerified: true,
          },
        });

        if (!user) {
          return res.status(404).json({
            status: false,
            message: "User not found",
            data: null,
          });
        }

        // Simpan data user ke req.user
        req.user = user; // Menyimpan seluruh objek user
        next();
      } catch (error) {
        console.error("Error while checking user:", error);
        return res.status(500).json({
          status: false,
          message: "Internal Server Error",
          data: null,
        });
      }
    } catch (error) {
      if (error.name === "JsonWebTokenError") {
        return res.status(401).json({
          status: false,
          message: "Invalid token",
          data: null,
        });
      }
      next(error);
    }
  },
  // Middleware untuk memeriksa role
  isAdmin: (req, res, next) => {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        status: false,
        message: "Only admin can access",
        data: null,
      });
    }
    next();
  },
  isEmployee: (req, res, next) => {
    if (req.user.role !== "employee") {
      return res.status(403).json({
        status: false,
        message: "Only employee can access",
        data: null,
      });
    }
    next();
  },
  isMitra: (req, res, next) => {
    if (req.user.role !== "employee" && req.user.role !== "admin") {
      return res.status(403).json({
        status: false,
        message: "Only admin or employee from mitra can access",
        data: null,
      });
    }
    next();
  },
  isUser: (req, res, next) => {
    if (req.user.role !== "user") {
      return res.status(403).json({
        status: false,
        message: "You are not authorized to access this resource",
        data: null,
      });
    }
    next();
  },
};