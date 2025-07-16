const { PrismaClient, Decimal } = require("@prisma/client");
const prisma = new PrismaClient();
const { utcTimePlus7, formatDateTimeWIB } = require("../utils/formattedDate");
const imageKit = require("../libs/imagekit");
const multer = require("../libs/multer").image;
const {
  formatListProduct,
  formatDetailProduct,
} = require("../utils/formattedProduct");

module.exports = {
  create: async (req, res, next) => {
    multer.single("image")(req, res, async (err) => {
      if (err) {
        return res.status(400).json({
          status: false,
          message: err.message || "File upload error",
          data: null,
        });
      }

      try {
        const {
          name,
          label,
          description,
          detail,
          price,
          duration,
          category_id,
          note,
          addOn,
        } = req.body;

        const cleanPrice = price.replace(/\./g, "").replace(/,/g, "");

        // Validasi input
        if (!name || name.trim() === "") {
          return res.status(400).json({
            status: false,
            message: "Name product must be required",
            data: null,
          });
        }

        if (
          !label ||
          !description ||
          !duration ||
          !detail ||
          !price ||
          !category_id
        ) {
          return res.status(400).json({
            status: false,
            message: "All fields must be required",
            data: null,
          });
        }

        // Validasi image
        if (!req.file) {
          return res.status(400).json({
            status: false,
            message: "Product image is required",
            data: null,
          });
        }

        // Cek existing product
        const existingProduct = await prisma.product.findFirst({
          where: { label: label },
        });

        if (existingProduct) {
          return res.status(400).json({
            status: false,
            message: "Product with this label already exists",
            data: null,
          });
        }

        // Upload image ke ImageKit
        const fileBuffer = req.file.buffer;
        const fileName = `PROD-${Date.now()}-${req.file.originalname}`;

        const uploadImage = await imageKit.upload({
          file: fileBuffer,
          fileName: fileName,
          folder: "/product",
        });

        // Create product dengan price sebagai Integer
        const product = await prisma.product.create({
          data: {
            name: name.trim(),
            label,
            description,
            duration: parseInt(duration),
            detail,
            image: uploadImage.url,
            isAvailable: true,
            price: new Decimal(cleanPrice),
            category_id: parseInt(category_id),
            createdAt: utcTimePlus7().toISOString(),
            note: note || null,
            addOn: addOn || null,
          },
        });

        const formattedProduct = {
          ...product,
          createdAt: formatDateTimeWIB(product.createdAt),
          price: new Intl.NumberFormat("id-ID").format(product.price),
        };

        res.status(201).json({
          status: true,
          message: "Product created successfully",
          data: formattedProduct,
        });
      } catch (error) {
        next(error);
      }
    });
  },

  // Get all products dengan optional query params
  read: async (req, res, next) => {
    try {
      const { category_id, search, sort = "asc" } = req.query;

      // Buat query filter
      let where = {};

      // Filter by category jika ada
      if (category_id) {
        where.category_id = Number(category_id);
      }

      // Search by name atau description jika ada
      if (search) {
        where.OR = [
          { name: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
        ];
      }

      const products = await prisma.product.findMany({
        where,
        include: {
          category: {
            select: {
              id: true,
              name: true,
            },
          },
          reviews: {
            include: {
              order: {
                include: {
                  user: {
                    // Menyertakan informasi pengguna
                    include: {
                      profile: true, // Menyertakan profil untuk avatar_url
                    },
                  },
                },
              },
            },
          },
          portfolios: {
            include: {
              media: true,
            },
          },
        },
      });

      const formattedProducts = products.map((product) => {
        const averageRating =
          product.reviews.length > 0
            ? (
                product.reviews.reduce((acc, curr) => acc + curr.rating, 0) /
                product.reviews.length
              ).toFixed(1)
            : "0.0";

        return formatListProduct({
          ...product,
          averageRating: Number(averageRating),
          totalReviews: product.reviews.length,
          reviews: product.reviews.map((review) => ({
            id: review.id,
            rating: review.rating,
            comment: review.comment,
            createdAt: formatDateTimeWIB(review.createdAt),
            user: review.order.user,
          })),
        });
      });

      res.json({
        status: true,
        message: "Get all products success",
        data: formattedProducts,
      });
    } catch (error) {
      next(error);
    }
  },

  // Get detail product by ID
  detail: async (req, res, next) => {
    try {
      const { id } = req.params;

      const product = await prisma.product.findUnique({
        where: {
          id: Number(id),
        },
        include: {
          category: {
            select: {
              id: true,
              name: true,
            },
          },
          reviews: {
            include: {
              order: {
                include: {
                  user: {
                    // Menyertakan informasi pengguna
                    include: {
                      profile: true, // Menyertakan profil untuk avatar_url
                    },
                  },
                },
              },
            },
          },
          portfolios: {
            include: {
              media: true,
            },
          },
        },
      });

      if (!product) {
        return res.status(404).json({
          status: false,
          message: "Product not found",
          data: null,
        });
      }

      // Hitung rata-rata rating
      const averageRating =
        product.reviews.length > 0
          ? (
              product.reviews.reduce((acc, curr) => acc + curr.rating, 0) /
              product.reviews.length
            ).toFixed(1)
          : "0.0";

      // Format response
      const formattedProduct = formatDetailProduct({
        ...product,
        averageRating: Number(averageRating),
        totalReviews: product.reviews.length,
        reviews: product.reviews.map((review) => ({
          id: review.id,
          rating: review.rating,
          comment: review.comment,
          createdAt: formatDateTimeWIB(review.createdAt),
          user: review.order.user,
        })),
      });

      res.json({
        status: true,
        message: "Get product detail success",
        data: formattedProduct,
      });
    } catch (error) {
      next(error);
    }
  },

  update: async (req, res, next) => {
    multer.single("image")(req, res, async (err) => {
      if (err) {
        return res.status(400).json({
          status: false,
          message: err.message || "File upload error",
          data: null,
        });
      }

      try {
        const { id } = req.params;
        const {
          name,
          label,
          description,
          duration,
          detail,
          price,
          category_id,
          isAvailable,
          note,
          addOn,
        } = req.body;

        // Validasi ID
        if (!id || isNaN(id)) {
          return res.status(400).json({
            status: false,
            message: "Invalid category ID",
            data: null,
          });
        }

        // Cek product exists
        const existingProduct = await prisma.product.findUnique({
          where: { id: Number(id) },
        });

        if (!existingProduct) {
          return res.status(404).json({
            status: false,
            message: "Product not found",
            data: null,
          });
        }

        // Cek duplicate name kecuali untuk product yang sama
        if (label && label !== existingProduct.label) {
          const duplicateLabel = await prisma.product.findFirst({
            where: {
              label: label,
              NOT: {
                id: Number(id),
              },
            },
          });

          if (duplicateLabel) {
            return res.status(400).json({
              status: false,
              message: "Product label already exists",
              data: null,
            });
          }
        }

        // Prepare update data
        let updateData = {};

        if (name) updateData.name = name.trim();
        if (label) updateData.label = label;
        if (description) updateData.description = description;
        if (duration) updateData.duration = parseInt(duration);
        if (detail) updateData.detail = detail;
        if (price) {
          const cleanPrice = price.replace(/\./g, "").replace(/,/g, "");
          updateData.price = new Decimal(cleanPrice);
        }
        if (category_id) updateData.category_id = parseInt(category_id);
        if (isAvailable !== undefined)
          updateData.isAvailable = isAvailable === "true";
        if (note !== undefined) updateData.note = note;
        if (addOn !== undefined) updateData.addOn = addOn;

        // Upload new image if provided
        if (req.file) {
          const fileBuffer = req.file.buffer;
          const fileName = `PROD-${Date.now()}-${req.file.originalname}`;

          const uploadImage = await imageKit.upload({
            file: fileBuffer,
            fileName: fileName,
            folder: "/product",
          });

          updateData.image = uploadImage.url;
        }

        // Update product
        const product = await prisma.product.update({
          where: { id: Number(id) },
          data: updateData,
        });

        const formattedProduct = {
          ...product,
          createdAt: formatDateTimeWIB(product.createdAt),
          price: new Intl.NumberFormat("id-ID").format(product.price),
        };

        res.status(200).json({
          status: true,
          message: "Product updated successfully",
          data: formattedProduct,
        });
      } catch (error) {
        next(error);
      }
    });
  },

  destroy: async (req, res, next) => {
    try {
      const { id } = req.params;

      // Cek produk yang ada
      const existingProduct = await prisma.product.findUnique({
        where: { id: Number(id) },
        include: {
          orderDetails: true, // Cek relasi dengan OrderDetail
          reviews: true, // Cek relasi dengan Review
          portfolios: {
            // Cek relasi dengan Portfolio
            include: {
              media: true, // Cek relasi dengan PortfolioMedia
            },
          },
        },
      });

      if (!existingProduct) {
        return res.status(404).json({
          status: false,
          message: "Product not found",
          data: null,
        });
      }

      // Cek apakah ada relasi dengan OrderDetail
      if (existingProduct.orderDetails.length > 0) {
        return res.status(400).json({
          status: false,
          message:
            "Gagal hapus produk karena terdapat pemesanan dengan produk ini",
          data: null,
        });
      }

      // Cek apakah ada relasi dengan Review
      if (existingProduct.reviews.length > 0) {
        return res.status(400).json({
          status: false,
          message:
            "Gagal hapus produk karena terdapat ulasan pada produk ini",
          data: null,
        });
      }

      // Hapus semua portofolio terkait
      for (const portfolio of existingProduct.portfolios) {
        if (portfolio.media.length > 0) {
          await prisma.portfolioMedia.deleteMany({
            where: { portfolio_id: portfolio.id },
          });
        }
      }

      // Hapus semua portofolio terkait
      await prisma.portfolio.deleteMany({
        where: { product_id: Number(id) },
      });

      // Hard delete produk
      await prisma.product.delete({
        where: { id: Number(id) },
      });

      res.status(200).json({
        status: true,
        message: "Product deleted successfully",
      });
    } catch (error) {
      next(error);
    }
  },
};
