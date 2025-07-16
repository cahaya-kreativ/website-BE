const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const imageKit = require("../libs/imagekit");
const multer = require("../libs/multer").image;
const bcrypt = require("bcrypt");
const {
  formatDateTimeWIB,
  utcTimePlus7,
  formatDateOnly,
} = require("../utils/formattedDate");

module.exports = {
  getDetail: async (req, res, next) => {
    try {
      // Check if user is authenticated
      if (!req.user) {
        return res.status(401).json({
          status: false,
          message: "Unauthorized, please login first",
          data: null,
        });
      }

      const userId = req.user.id;

      const userWithProfile = await prisma.user.findUnique({
        where: {
          id: parseInt(userId),
        },
        include: {
          profile: {
            select: {
              id: true,
              avatar_url: true,
              birth_date: true,
              address: true,
              city: true,
              province: true,
              postal_code: true,
            },
          },
        },
      });

      if (!userWithProfile) {
        return res.status(404).json({
          status: false,
          message: "User not found!",
          data: null,
        });
      }

      // Remove sensitive data
      delete userWithProfile.password;
      delete userWithProfile.otp;

      // Format dates
      if (userWithProfile.otpCreatedAt) {
        userWithProfile.otpCreatedAt = formatDateTimeWIB(
          userWithProfile.otpCreatedAt
        );
      }
      if (userWithProfile.profile?.birth_date) {
        userWithProfile.profile.birth_date = formatDateOnly(
          userWithProfile.profile.birth_date
        );
      }

      res.status(200).json({
        status: true,
        message: "OK",
        data: userWithProfile,
      });
    } catch (err) {
      next(err);
    }
  },
  updateProfile: async (req, res, next) => {
    multer.single("avatar_url")(req, res, async (err) => {
      if (err) {
        return res.status(400).json({
          status: false,
          message: err.message || "File upload error",
          data: null,
        });
      }

      try {
        // Check if user is authenticated
        if (!req.user) {
          return res.status(401).json({
            status: false,
            message: "Unauthorized, please login first",
            data: null,
          });
        }

        const userId = req.user.id;
        const {
          fullname,
          phoneNumber,
          birth_date,
          address,
          city,
          province,
          postal_code,
        } = req.body;

        // Validate phone number format
        if (phoneNumber && !/^\d+$/.test(phoneNumber)) {
          return res.status(400).json({
            status: false,
            message:
              "Invalid phone number format. It must contain only numeric characters.",
            data: null,
          });
        }

        // Prepare user update data
        let userUpdateData = {};
        if (fullname) userUpdateData.fullname = fullname;
        if (phoneNumber) userUpdateData.phoneNumber = phoneNumber;

        // Prepare profile update data
        let profileUpdateData = {};
        if (birth_date) {
          // Pastikan format tanggal valid
          const birthDate = new Date(birth_date);
          if (isNaN(birthDate.getTime())) {
            return res.status(400).json({
              status: false,
              message: "Invalid birth date format. Use YYYY-MM-DD",
              data: null,
            });
          }
          profileUpdateData.birth_date = birthDate;
        }
        if (address) profileUpdateData.address = address;
        if (city) profileUpdateData.city = city;
        if (province) profileUpdateData.province = province;
        if (postal_code) profileUpdateData.postal_code = postal_code;

        // Handle avatar upload
        if (req.file) {
          const uploadResult = await imageKit.upload({
            file: req.file.buffer,
            fileName: `avatar_${userId}_${Date.now()}`,
            folder: "/profile-cust",
          });

          if (uploadResult.url) {
            profileUpdateData.avatar_url = uploadResult.url;
          }
        }

        // Check if there's any data to update
        if (
          Object.keys(userUpdateData).length === 0 &&
          Object.keys(profileUpdateData).length === 0
        ) {
          return res.status(400).json({
            status: false,
            message: "At least one field must be updated",
            data: null,
          });
        }

        // Update user and profile in a transaction
        const updatedUser = await prisma.$transaction(async (prisma) => {
          // Update user data if needed
          const user = await prisma.user.update({
            where: { id: parseInt(userId) },
            data: userUpdateData,
          });

          // Update or create profile
          const profile = await prisma.profile.upsert({
            where: { user_id: parseInt(userId) },
            create: {
              user_id: parseInt(userId),
              address: address || "",
              city: city || "",
              province: province || "",
              postal_code: postal_code || "",
              ...profileUpdateData,
            },
            update: profileUpdateData,
          });

          // Get updated user with profile
          return prisma.user.findUnique({
            where: { id: parseInt(userId) },
            include: {
              profile: {
                select: {
                  id: true,
                  avatar_url: true,
                  birth_date: true,
                  address: true,
                  city: true,
                  province: true,
                  postal_code: true,
                },
              },
            },
          });
        });

        // Remove sensitive data
        delete updatedUser.password;
        delete updatedUser.otp;

        // Format dates
        if (updatedUser.otpCreatedAt) {
          updatedUser.otpCreatedAt = formatDateTimeWIB(
            updatedUser.otpCreatedAt
          );
        }
        if (updatedUser.profile?.birth_date) {
          updatedUser.profile.birth_date = formatDateOnly(
            updatedUser.profile.birth_date
          );
        }

        res.status(200).json({
          status: true,
          message: "Profile updated successfully",
          data: updatedUser,
        });
      } catch (err) {
        next(err);
      }
    });
  },
  updatePass: async (req, res, next) => {
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
        include: {
          profile: {
            select: {
              id: true,
              avatar_url: true,
              birth_date: true,
              address: true,
              city: true,
              province: true,
              postal_code: true,
            },
          },
        },
      });

      // Check if user exists and has password (not Google OAuth user)
      if (!user || !user.password) {
        return res.status(400).json({
          status: false,
          message: user.google_id
            ? `"Password update failed, because you are logged in with google. You can update in page "Forget Password"`
            : "User not found",
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
      const updatedUser = await prisma.$transaction(async (prisma) => {
        // Update password
        await prisma.user.update({
          where: { id: userId },
          data: { password: encryptedNewPassword },
        });

        // Create notification
        await prisma.notification.create({
          data: {
            title: "Password Updated",
            message: "Your password has been updated successfully!",
            createdAt: utcTimePlus7(),
            user: { connect: { id: userId } },
          },
        });

        // Get updated user with profile
        return prisma.user.findUnique({
          where: { id: userId },
          include: {
            profile: {
              select: {
                id: true,
                avatar_url: true,
                birth_date: true,
                address: true,
                city: true,
                province: true,
                postal_code: true,
              },
            },
          },
        });
      });

      // Remove sensitive data
      delete updatedUser.password;
      delete updatedUser.otp;

      // Format dates
      if (updatedUser.otpCreatedAt) {
        updatedUser.otpCreatedAt = formatDateTimeWIB(updatedUser.otpCreatedAt);
      }
      if (updatedUser.profile?.birth_date) {
        updatedUser.profile.birth_date = formatDateOnly(
          updatedUser.profile.birth_date
        );
      }

      res.status(200).json({
        status: true,
        message: "Your password has been successfully updated!",
        data: updatedUser,
      });
    } catch (err) {
      next(err);
    }
  },
};
