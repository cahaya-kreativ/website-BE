const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { utcTimePlus7, formatDateTimeWIB } = require("../utils/formattedDate");
const imageKit = require("../libs/imagekit");
const multer = require("../libs/multer").image;

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
        const { name, description } = req.body;

        // Validasi input
        if (!name) {
          return res.status(400).json({
            status: false,
            message: "Name category must be required",
            data: null,
          });
        }

        // Validasi description
        if (!description) {
          return res.status(400).json({
            status: false,
            message: "Description must be required",
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

        // Cek apakah kategori dengan nama yang sama sudah ada
        const existingCategory = await prisma.category.findFirst({
          where: { name: name.trim() },
        });

        if (existingCategory) {
          return res.status(400).json({
            status: false,
            message: "Category with this name already exists",
            data: null,
          });
        }
        // Upload image ke ImageKit
        const fileBuffer = req.file.buffer;
        const fileName = `CAT-${Date.now()}-${req.file.originalname}`;

        const uploadImage = await imageKit.upload({
          file: fileBuffer,
          fileName: fileName,
          folder: "/category",
        });

        // create category
        const category = await prisma.category.create({
          data: {
            name: name.trim(),
            description,
            image: uploadImage.url,
            createdAt: utcTimePlus7().toISOString(),
          },
        });

        const formattedCategory = {
          ...category,
          createdAt: formatDateTimeWIB(category.createdAt),
        };

        res.status(201).json({
          status: true,
          message: "Category created successfully",
          data: formattedCategory,
        });
      } catch (error) {
        console.error("Create Category Error:", error);
        next(error);
      }
    });
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
        const { name, description } = req.body; // Hapus 'image' dari sini
  
        // Validasi ID
        if (!id || isNaN(id)) {
          return res.status(400).json({
            status: false,
            message: "Invalid category ID",
            data: null,
          });
        }
  
        // Cek apakah kategori exists
        const existingCategory = await prisma.category.findUnique({
          where: { id: Number(id) },
        });
  
        if (!existingCategory) {
          return res.status(404).json({
            status: false,
            message: "Category not found",
            data: null,
          });
        }
  
        // Cek duplicate name kecuali untuk category yang sama
        if (name && name.trim() !== existingCategory.name) {
          const duplicateName = await prisma.category.findFirst({
            where: {
              name: name.trim(),
              NOT: {
                id: Number(id),
              },
            },
          });
  
          if (duplicateName) {
            return res.status(400).json({
              status: false,
              message: "Category name already exists",
              data: null,
            });
          }
        }
  
        // Prepare update data
        let updateData = {};
  
        if (name) updateData.name = name.trim();
        if (description) updateData.description = description.trim(); // Pastikan ini juga di-trim
  
        // Upload new image if provided
        if (req.file) {
          const fileBuffer = req.file.buffer;
          const fileName = `CAT-${Date.now()}-${req.file.originalname}`;
  
          const uploadImage = await imageKit.upload({
            file: fileBuffer,
            fileName: fileName,
            folder: "/category",
          });
  
          updateData.image = uploadImage.url;
        }
  
        const category = await prisma.category.update({
          where: { id: Number(id) },
          data: updateData,
        });
  
        const formattedCategory = {
          ...category,
          createdAt: formatDateTimeWIB(category.createdAt),
        };
  
        res.status(200).json({
          status: true,
          message: "Category updated successfully",
          data: formattedCategory,
        });
      } catch (error) {
        console.error("Update Category Error:", error);
        next(error);
      }
    });
  },

  read: async (req, res, next) => {
    try {
      const categories = await prisma.category.findMany({});

      const formattedCategories = categories.map((category) => ({
        ...category,
        createdAt: formatDateTimeWIB(category.createdAt),
      }));

      res.json({
        status: true,
        message: "Get all categories success",
        data: formattedCategories,
      });
    } catch (error) {
      next(error);
    }
  },

  detail: async (req, res, next) => {
    try {
      const { id } = req.params;

      const category = await prisma.category.findUnique({
        where: { id: Number(id) },
      });

      if (!category) {
        return res.status(404).json({
          status: false,
          message: "Category not found",
          data: null,
        });
      }

      const formattedCategory = {
        ...category,
        createdAt: formatDateTimeWIB(category.createdAt),
      };

      res.json({
        status: true,
        message: "Get category detail success",
        data: formattedCategory,
      });
    } catch (error) {
      next(error);
    }
  },

  destroy: async (req, res, next) => {
    try {
      const { id } = req.params;

      // Validasi ID
      if (!id || isNaN(id)) {
        return res.status(400).json({
          status: false,
          message: "Invalid category ID",
          data: null,
        });
      }

      // Cek apakah kategori exists
      const existingCategory = await prisma.category.findUnique({
        where: { id: Number(id) },
      });

      if (!existingCategory) {
        return res.status(404).json({
          status: false,
          message: "Category not found",
          data: null,
        });
      }

      // Cek apakah kategori memiliki produk terkait
      const productsCount = await prisma.product.count({
        where: { category_id: Number(id) },
      });

      if (productsCount > 0) {
        return res.status(400).json({
          status: false,
          message: "Gagal hapus kategori karena terdapat produk dengan kategori ini",
          data: null,
        });
      }

      await prisma.category.delete({
        where: { id: Number(id) },
      });

      res.status(200).json({
        status: true,
        message: "Category deleted successfully",
      });
    } catch (error) {
      console.error("Delete Category Error:", error);
      next(error);
    }
  },
};
