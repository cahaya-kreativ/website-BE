const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { utcTimePlus7, formatDateTimeWIB } = require("../utils/formattedDate");
const imageKit = require("../libs/imagekit");
const multer = require("../libs/multer").image;

module.exports = {
  create: async (req, res, next) => {
    multer.array("image", 10)(req, res, async (err) => {
      if (err) {
        return res.status(400).json({
          status: false,
          message: err.message || "File upload error",
          data: null,
        });
      }

      try {
        const { category } = req.body;

        // Validasi kategori
        if (!category) {
          return res.status(400).json({
            status: false,
            message: "Category is required",
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

        const galleryEntries = []; // Array untuk menyimpan entri galeri

        // Upload file ke ImageKit
        for (const image of req.files) {
          // Iterasi melalui setiap file
          const fileBuffer = image.buffer;
          const fileName = `GAL-${Date.now()}-${image.originalname}`;
          const folder = "/gallery/images";

          const uploadedFile = await imageKit.upload({
            file: fileBuffer,
            fileName: fileName,
            folder: folder,
          });

          // Create gallery entry
          const gallery = await prisma.gallery.create({
            data: {
              category, // Simpan kategori
              createdAt: utcTimePlus7(), // Simpan waktu saat ini
              image: uploadedFile.url, // Simpan URL gambar dari ImageKit
            },
          });

          const formattedGallery = {
            ...gallery,
            createdAt: formatDateTimeWIB(gallery.createdAt),
          };

          galleryEntries.push(formattedGallery); // Simpan entri ke array
        }

        res.status(201).json({
          status: true,
          message: "Gallery created successfully",
          data: galleryEntries,
        });
      } catch (error) {
        next(error);
      }
    });
  },

  getGallery: async (req, res, next) => {
    try {
      // Fetch all gallery entries from the database
      const galleries = await prisma.gallery.findMany({
        orderBy: {
          createdAt: "asc", // Optional: Order by creation date
        },
      });

      // Return the gallery entries in the response
      res.status(200).json({
        status: true,
        message: "Gallery retrieved successfully",
        data: galleries,
      });
    } catch (error) {
      console.error(error);
      next(error); // Pass the error to the error handling middleware
    }
  },

  destroy: async (req, res, next) => {
    const { id } = req.params; // Ambil ID dari parameter

    try {
      // Setelah media dihapus, hapus galeri
      const deletedGallery = await prisma.gallery.delete({
        where: { id: Number(id) },
      });

      if (deletedGallery) {
        res.status(200).json({
          status: true,
          message: "Gallery entry deleted successfully",
          data: null,
        });
      }
    } catch (error) {
      next(error);
    }
  },
};
