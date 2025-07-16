const multer = require("multer");

const generateFileFilter = (allowedTypes, maxSize) => {
  return (req, file, callback) => {
    // Allowed types untuk image dan video
    const allowedMimetypes = {
      image: ["image/png", "image/jpg", "image/jpeg", "image/webp"],
      video: ["video/mp4", "video/mpeg", "video/quicktime", "video/MOV"],
    };

    const mimetypes = allowedTypes.flatMap((type) => allowedMimetypes[type]);

    if (!mimetypes.includes(file.mimetype)) {
      const err = new Error(
        `Only ${allowedTypes.join(" and ")} files are allowed to upload!`
      );
      err.status = 400;
      return callback(err, false);
    }

    const fileSize = parseInt(req.headers["content-length"]);
    const maxSizeInBytes = maxSize * 1024 * 1024;
    if (fileSize > maxSizeInBytes) {
      const err = new Error(`Maximum file size is ${maxSize} MB`);
      err.status = 400;
      return callback(err, false);
    }

    callback(null, true);
  };
};

module.exports = {
  image: multer({
    fileFilter: generateFileFilter(["image"], 5), // Max 2MB untuk single image
    onError: (err, next) => {
      next(err);
    },
  }),
  media: multer({
    fileFilter: generateFileFilter(["image", "video"], 50), // Max 15MB untuk media
    onError: (err, next) => {
      next(err);
    },
  }),
};
