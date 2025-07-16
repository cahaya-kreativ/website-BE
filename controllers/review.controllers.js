const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { utcTimePlus7, formatDateTimeWIB } = require("../utils/formattedDate");
const paginationReq = require("../utils/pagination");

module.exports = {
  // Create review (hanya untuk order yang sudah done)
  create: async (req, res, next) => {
    try {
      const { orderId } = req.params;
      const { rating, comment } = req.body;
      const userId = req.user.id;

      // Validasi rating
      if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({
          status: false,
          message: "Rating must be between 1 and 5",
          data: null,
        });
      }

      // Cek order exists dan milik user yang login, sekaligus ambil product_id
      const order = await prisma.order.findFirst({
        where: {
          id: Number(orderId),
          user_id: userId,
          status: "done", // Hanya order yang done yang bisa direview
        },
        include: {
          orderDetails: {
            select: {
              product_id: true,
            },
          },
        },
      });

      if (!order) {
        return res.status(404).json({
          status: false,
          message: "Order not found or not completed yet",
          data: null,
        });
      }

      // Ambil product_id dari order detail
      const productId = order.orderDetails[0].product_id;

      // Cek apakah order sudah direview
      const existingReview = await prisma.review.findUnique({
        where: { order_id: Number(orderId) },
      });

      if (existingReview) {
        return res.status(400).json({
          status: false,
          message: "Review already exists for this order",
          data: null,
        });
      }

      // Create review dengan product_id dari order detail
      const review = await prisma.review.create({
        data: {
          rating,
          comment,
          createdAt: utcTimePlus7(),
          order: { connect: { id: Number(orderId) } },
          product: { connect: { id: productId } },
        },
        include: {
          order: {
            include: {
              user: {
                select: {
                  id: true,
                  fullname: true,
                },
              },
              orderDetails: {
                include: {
                  product: {
                    select: {
                      id: true,
                      name: true,
                      image: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      const formattedReview = {
        ...review,
        createdAt: formatDateTimeWIB(review.createdAt),
        order: {
          ...review.order,
          createdAt: formatDateTimeWIB(review.order.createdAt),
          expired_paid: formatDateTimeWIB(review.order.expired_paid),
        },
      };

      res.status(201).json({
        status: true,
        message: "Review created successfully",
        data: formattedReview,
      });
    } catch (error) {
      next(error);
    }
  },

  // Get all reviews for a product
  getProductReviews: async (req, res, next) => {
    try {
      const { productId } = req.params;
      const { find, filter, page = 1 } = req.query;
      const pagination = paginationReq.paginationPage(Number(page), 5);

      // Build where conditions
      const conditions = {
        product_id: Number(productId),
      };

      if (find) {
        conditions.comment = { contains: find, mode: "insensitive" }; // Ubah 'title' menjadi 'comment'
      }

      if (filter) {
        conditions.rating = { equals: Number(filter) };
      }

      // Hitung total review, bukan total order
      const totalData = await prisma.review.count({ where: conditions });
      const totalPage = Math.ceil(totalData / pagination.take);

      const reviews = await prisma.review.findMany({
        where: conditions,
        take: pagination.take,
        skip: pagination.skip,
        include: {
          order: {
            include: {
              user: {
                include: {
                  profile: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      const formattedReviews = reviews.map((review) => ({
        ...review,
        createdAt: formatDateTimeWIB(review.createdAt),
        order: {
          ...review.order,
          createdAt: formatDateTimeWIB(review.order.createdAt),
          expired_paid: formatDateTimeWIB(review.order.expired_paid),
        },
      }));

      // Hitung rata-rata rating
      const averageRating =
        reviews.length > 0
          ? (
              reviews.reduce((acc, curr) => acc + curr.rating, 0) /
              reviews.length
            ).toFixed(1)
          : 0;

      res.json({
        status: true,
        message: "Get product reviews success",
        data: {
          averageRating: Number(averageRating),
          totalReviews: reviews.length,
          reviews: formattedReviews,
          pagination: {
            page: Number(page) ?? 1,
            per_page: pagination.take,
            pageCount: totalPage,
            total_items: totalData,
            total_pages: Math.ceil(totalData / pagination.take),
          },
        },
      });
    } catch (error) {
      next(error);
    }
  },

  // Get user's reviews
  getUserReviews: async (req, res, next) => {
    try {
      const userId = req.user.id;

      const reviews = await prisma.review.findMany({
        where: {
          order: {
            user_id: userId,
          },
        },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
          order: true,
        },
      });

      const formattedReviews = reviews.map((review) => ({
        ...review,
        createdAt: formatDateTimeWIB(review.createdAt),
        order: {
          ...review.order,
          createdAt: formatDateTimeWIB(review.order.createdAt),
          expired_paid: formatDateTimeWIB(review.order.expired_paid),
        },
      }));

      res.json({
        status: true,
        message: "Get user reviews success",
        data: formattedReviews,
      });
    } catch (error) {
      next(error);
    }
  },

  // Update review
  update: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { rating, comment } = req.body;
      const userId = req.user.id;

      // Validasi rating
      if (rating && (rating < 1 || rating > 5)) {
        return res.status(400).json({
          status: false,
          message: "Rating must be between 1 and 5",
          data: null,
        });
      }

      // Cek review exists dan milik user yang login
      const existingReview = await prisma.review.findFirst({
        where: {
          id: Number(id),
          order: {
            user_id: userId,
          },
        },
      });

      if (!existingReview) {
        return res.status(404).json({
          status: false,
          message: "Review not found",
          data: null,
        });
      }

      // Update review
      const review = await prisma.review.update({
        where: { id: Number(id) },
        data: {
          ...(rating && { rating: Number(rating) }), // Convert rating to Number
          ...(comment && { comment }),
        },
        include: {
          product: {
            select: {
              id: true,
              name: true,
            },
          },
          order: {
            include: {
              user: {
                select: {
                  id: true,
                  fullname: true,
                },
              },
            },
          },
        },
      });

      const formattedReview = {
        ...review,
        createdAt: formatDateTimeWIB(review.createdAt),
      };

      res.json({
        status: true,
        message: "Review updated successfully",
        data: formattedReview,
      });
    } catch (error) {
      next(error);
    }
  },
};
