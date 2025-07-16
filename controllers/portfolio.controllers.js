const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { utcTimePlus7, formatDateTimeWIB } = require("../utils/formattedDate");
const imageKit = require("../libs/imagekit");
const multer = require("../libs/multer").media;

module.exports = {
  create: async (req, res, next) => {
    multer.array("media", 10)(req, res, async (err) => {
      if (err) {
        return res.status(400).json({
          status: false,
          message: err.message || "File upload error",
          data: null,
        });
      }

      try {
        const { title, description, product_id } = req.body;

        // Validasi input
        if (!title || title.trim() === "") {
          return res.status(400).json({
            status: false,
            message: "Title is required",
            data: null,
          });
        }

        if (!description || description.trim() === "") {
          return res.status(400).json({
            status: false,
            message: "Description is required",
            data: null,
          });
        }

        if (!product_id) {
          return res.status(400).json({
            status: false,
            message: "Product ID is required",
            data: null,
          });
        }

        // Validasi files
        if (!req.files || req.files.length === 0) {
          return res.status(400).json({
            status: false,
            message: "Portfolio media are required (min 1 file)",
            data: null,
          });
        }

        if (req.files.length > 10) {
          return res.status(400).json({
            status: false,
            message: "Maximum 10 files allowed",
            data: null,
          });
        }

        // Cek product exists
        const existingProduct = await prisma.product.findUnique({
          where: { id: Number(product_id) },
        });

        if (!existingProduct) {
          return res.status(400).json({
            status: false,
            message: "Product ID not found",
            data: null,
          });
        }

        // Upload multiple files ke ImageKit
        const uploadPromises = req.files.map((file) => {
          const fileBuffer = file.buffer;
          const fileName = `PORT-${Date.now()}-${file.originalname}`;
          const folder = file.mimetype.startsWith("image/")
            ? "/portfolio/images"
            : "/portfolio/videos";

          return imageKit.upload({
            file: fileBuffer,
            fileName: fileName,
            folder: folder,
          });
        });

        const uploadedFiles = await Promise.all(uploadPromises);

        // Create portfolio dengan multiple media
        const portfolio = await prisma.portfolio.create({
          data: {
            title: title.trim(),
            description: description.trim(),
            product_id: parseInt(product_id),
            createdAt: utcTimePlus7(),
            media: {
              create: uploadedFiles.map((file, index) => ({
                url: file.url,
                type: req.files[index].mimetype.startsWith("image/")
                  ? "IMAGE"
                  : "VIDEO",
                createdAt: utcTimePlus7(),
              })),
            },
          },
          include: {
            product: {
              select: {
                id: true,
                name: true,
              },
            },
            media: true,
          },
        });

        const formattedPortfolio = {
          ...portfolio,
          createdAt: formatDateTimeWIB(portfolio.createdAt),
        };

        res.status(201).json({
          status: true,
          message: "Portfolio created successfully",
          data: formattedPortfolio,
        });
      } catch (error) {
        next(error);
      }
    });
  },

  read: async (req, res, next) => {
    try {
      const portfolios = await prisma.portfolioMedia.findMany({});

      const formattedPortfolios = portfolios.map((portfolio) => ({
        ...portfolio,
        createdAt: formatDateTimeWIB(portfolio.createdAt),
      }));

      res.status(200).json({
        status: true,
        message: "Get all portfolios success",
        data: formattedPortfolios,
      });
    } catch (error) {
      next(error);
    }
  },

  detail: async (req, res, next) => {
    try {
      const { id } = req.params;
      const portfolio = await prisma.portfolio.findUnique({
        where: { id: Number(id) },
        include: {
          media: true,
          product: {
            select: {
              id: true,
              name: true,
            },
          },
          media: true,
        },
      });

      if (!portfolio) {
        return res.status(404).json({
          status: false,
          message: "Portfolio not found",
          data: null,
        });
      }

      const formattedPortfolio = {
        ...portfolio,
        createdAt: formatDateTimeWIB(portfolio.createdAt),
      };

      res.status(200).json({
        status: true,
        message: "Get portfolio detail success",
        data: formattedPortfolio,
      });
    } catch (error) {
      next(error);
    }
  },

  update: async (req, res, next) => {
    multer.array("media", 10)(req, res, async (err) => {
      if (err) {
        return res.status(400).json({
          status: false,
          message: err.message || "File upload error",
          data: null,
        });
      }

      try {
        const { id } = req.params;
        const { title, description, product_id } = req.body;

        // Cek portfolio exists
        const existingPortfolio = await prisma.portfolio.findUnique({
          where: { id: Number(id) },
        });

        if (!existingPortfolio) {
          return res.status(404).json({
            status: false,
            message: "Portfolio not found",
            data: null,
          });
        }

        // Cek product exists jika product_id diupdate
        if (product_id) {
          const existingProduct = await prisma.product.findUnique({
            where: { id: Number(product_id) },
          });

          if (!existingProduct) {
            return res.status(400).json({
              status: false,
              message: "Product ID not found",
              data: null,
            });
          }
        }

        // Upload new media jika ada
        let newMedia = [];
        if (req.files && req.files.length > 0) {
          const uploadPromises = req.files.map((file) => {
            const fileBuffer = file.buffer;
            const fileName = `PORT-${Date.now()}-${file.originalname}`;
            const folder = file.mimetype.startsWith("image/")
              ? "/portfolio/images"
              : "/portfolio/videos";

            return imageKit.upload({
              file: fileBuffer,
              fileName: fileName,
              folder: folder,
            });
          });

          const uploadedFiles = await Promise.all(uploadPromises);
          newMedia = uploadedFiles.map((file, index) => ({
            url: file.url,
            type: req.files[index].mimetype.startsWith("image/")
              ? "IMAGE"
              : "VIDEO",
            createdAt: utcTimePlus7(),
          }));
        }

        // Update portfolio
        const portfolio = await prisma.portfolio.update({
          where: { id: Number(id) },
          data: {
            ...(title && { title: title.trim() }),
            ...(description && { description: description.trim() }),
            ...(product_id && { product_id: parseInt(product_id) }),
            ...(newMedia.length > 0 && {
              media: {
                create: newMedia,
              },
            }),
          },
          include: {
            product: {
              select: {
                id: true,
                name: true,
              },
            },
            media: true,
          },
        });

        const formattedPortfolio = {
          ...portfolio,
          createdAt: formatDateTimeWIB(portfolio.createdAt),
        };

        res.status(200).json({
          status: true,
          message: "Portfolio updated successfully",
          data: formattedPortfolio,
        });
      } catch (error) {
        next(error);
      }
    });
  },

  destroy: async (req, res, next) => {
    try {
      const { id } = req.params;

      const existingPortfolio = await prisma.portfolio.findUnique({
        where: { id: Number(id) },
      });

      if (!existingPortfolio) {
        return res.status(404).json({
          status: false,
          message: "Portfolio not found",
          data: null,
        });
      }

      // Delete portfolio dan related media (cascade delete di Prisma schema)
      await prisma.portfolio.delete({
        where: { id: Number(id) },
      });

      res.status(200).json({
        status: true,
        message: "Portfolio deleted successfully",
      });
    } catch (error) {
      next(error);
    }
  },
};
