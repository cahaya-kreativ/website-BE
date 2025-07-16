const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { URL_RESET_PASS, FRONT_END_URL } = process.env;
const { generatedOTP } = require("../utils/otpGenerator");
const nodemailer = require("../utils/nodemailer");
const {
  formatDateTimeToUTC,
  utcTimePlus7,
  formatDateOnly,
  formatDateTimeWIB,
} = require("../utils/formattedDate");
const axios = require("axios");

module.exports = {
  register: async (req, res, next) => {
    try {
      const { fullname, email, phoneNumber, password } = req.body;
      const passwordValidator =
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*.])[A-Za-z\d!@#$%^&*.]{8,50}$/;
      const emailValidator = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      // Check for existing user with the same email
      const exist = await prisma.user.findUnique({
        where: { email },
      });
      // Validate required fields
      if (!fullname || !email || !phoneNumber || !password) {
        return res.status(400).json({
          status: false,
          message: "Input must be required",
          data: null,
        });
      } else if (exist) {
        return res.status(401).json({
          status: false,
          message: "Email already used!",
        });
      }

      // Validate email format
      if (!emailValidator.test(email)) {
        return res.status(400).json({
          status: false,
          message: "Invalid email format.",
          data: null,
        });
      }

      // Validate phone number format
      if (!/^\d+$/.test(phoneNumber)) {
        return res.status(400).json({
          status: false,
          message:
            "Invalid phone number format. It must contain only numeric characters.",
          data: null,
        });
      }

      // Validate phone number length
      if (phoneNumber.length < 10 || phoneNumber.length > 15) {
        return res.status(400).json({
          status: false,
          message:
            "Invalid phone number length. It must be between 10 and 15 characters.",
          data: null,
        });
      }

      // Validate password format
      if (!passwordValidator.test(password)) {
        return res.status(400).json({
          status: false,
          message:
            "Invalid password format. It must contain at least 1 lowercase, 1 uppercase, 1 digit number, 1 symbol, and minimum 8 characters long.",
          data: null,
        });
      }

      // Generate and store OTP for email verification
      const otpObject = generatedOTP();
      const otp = otpObject.code;
      const otpCreatedAt = otpObject.createdAt;

      // Encrypt user password
      const encryptedPassword = await bcrypt.hash(password, 10);
      const user = await prisma.user.create({
        data: {
          fullname,
          email,
          phoneNumber,
          otp,
          otpCreatedAt,
          password: encryptedPassword,
        },
      });
      delete user.password;
      user.otpCreatedAt = formatDateTimeToUTC(user.otpCreatedAt);

      // Send email verification OTP
      const html = await nodemailer.getHTML("otp.ejs", { email, otp });
      await nodemailer.sendMail(email, "Email Activation", html);

      // Register Notification
      const notification = await prisma.notification.create({
        data: {
          title: "Welcome",
          message: "Your account has been created successfully.",
          createdAt: utcTimePlus7().toISOString(),
          user: { connect: { id: user.id } },
        },
      });

      const formattedUser = {
        ...user,
        otpCreatedAt: formatDateTimeWIB(user.otpCreatedAt),
      };

      res.status(201).json({
        status: true,
        message: "User Created Successfully",
        data: formattedUser,
      });
    } catch (error) {
      next(error);
    }
  },
  login: async (req, res, next) => {
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

      // Check if only the user
      if (user.role !== "user") {
        return res.status(403).json({
          status: false,
          message: "Access denied. Only role user can log in.",
          data: null,
        });
      }

      // Validate only login google
      if (!user.password && user.google_id) {
        return res.status(401).json({
          status: false,
          message: "Authentication failed. Please use Google OAuth to log in",
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
  verifyOtp: async (req, res, next) => {
    try {
      const { email, otp } = req.body;

      // Pastikan email tidak undefined
      if (!email) {
        return res.status(400).json({
          status: false,
          message: "Email is required",
          data: null,
        });
      }

      // Set OTP expired at 2 minutes
      const otpExpired = 2 * 60 * 1000;

      // Check for existing user with the same email
      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        return res.status(404).json({
          status: false,
          message: "User not found!",
        });
      }

      // Check if user is already verified
      if (user.isVerified) {
        return res.status(400).json({
          status: false,
          message: "Account is already verified!",
          data: null,
        });
      }

      // Return error if the provided OTP is incorrect
      if (user.otp !== otp) {
        return res.status(401).json({
          status: false,
          message: "Invalid OTP",
          data: null,
        });
      }

      // Set Expired otp
      const currentTime = utcTimePlus7();

      const isExpired = currentTime - user.otpCreatedAt > otpExpired;

      if (isExpired) {
        return res.status(400).json({
          status: false,
          message: "OTP has expired. Please resend new otp.",
          data: null,
        });
      }

      // Update user verification status
      const statusUser = await prisma.user.update({
        where: { email },
        data: { isVerified: true },
      });
      delete user.password;
      user.otpCreatedAt = formatDateTimeToUTC(user.otpCreatedAt);

      res.status(200).json({
        status: true,
        message: "Activation successfully. You're Account is Verified",
        data: statusUser,
      });
    } catch (error) {
      next(error);
    }
  },
  resendOtp: async (req, res, next) => {
    try {
      const { email } = req.body;

      // Check for existing user with the same email
      const user = await prisma.user.findUnique({
        where: { email },
      });

      // Pastikan email tidak undefined
      if (!email) {
        return res.status(400).json({
          status: false,
          message: "Email is required",
          data: null,
        });
      }

      if (!user) {
        return res.status(404).json({
          status: false,
          message: "User not found!",
        });
      }

      // Check if user is already verified
      if (user.isVerified) {
        return res.status(400).json({
          status: false,
          message: "Account is already verified! No need to verify again.",
          data: null,
        });
      }

      // Generate a new OTP and its creation timestamp
      const otpObject = generatedOTP();
      otp = otpObject.code;
      otpCreatedAt = otpObject.createdAt;
      delete user.password;

      // Send the new OTP via email
      const html = await nodemailer.getHTML("otp.ejs", { email, otp });
      await nodemailer.sendMail(email, "Email Activation", html);

      // Update user's OTP and OTP creation timestamp
      const resendOtp = await prisma.user.update({
        where: { email },
        data: { otp, otpCreatedAt },
      });

      resendOtp.otpCreatedAt = formatDateTimeToUTC(resendOtp.otpCreatedAt);

      res.status(200).json({
        status: true,
        message: "Resend OTP successfully, Check your email or spam!",
        data: resendOtp,
      });
    } catch (error) {
      next(error);
    }
  },
  forgetPassword: async (req, res, next) => {
    try {
      const { email } = req.body;

      const user = await prisma.user.findUnique({ where: { email } });

      // Pastikan email tidak undefined
      if (!email) {
        return res.status(400).json({
          status: false,
          message: "Email is required",
          data: null,
        });
      }

      if (!user) {
        return res.status(404).json({
          status: false,
          message: "user not found",
          data: null,
        });
      }

      const token = jwt.sign({ email: user.email }, process.env.JWT_SECRET_KEY);

      const html = await nodemailer.getHTML("link-reset.ejs", {
        name: user.fullname,
        url: `${URL_RESET_PASS}?token=${token}`,
      });

      await nodemailer.sendMail(email, "Password Reset Request", html);

      // Setelah pengiriman email berhasil
      return res.status(200).json({
        status: true,
        message:
          "Success Send Request Forget Password, Check your email or spam!",
      });
    } catch (error) {
      next(error);
    }
  },
  resetPassword: async (req, res, next) => {
    try {
      const { token } = req.query;
      const { password, passwordConfirmation } = req.body;

      const passwordValidator =
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*.])[A-Za-z\d!@#$%^&*.]{8,12}$/;

      if (!password || !passwordConfirmation) {
        return res.status(400).json({
          status: false,
          message: "Both password and password confirmation are required!",
          data: null,
        });
      }

      // Validate password format
      if (!passwordValidator.test(password)) {
        return res.status(400).json({
          status: false,
          message:
            "Invalid password format. It must contain at least 1 lowercase, 1 uppercase, 1 digit number, 1 symbol, and be between 8 and 12 characters long.",
          data: null,
        });
      }

      if (password !== passwordConfirmation) {
        return res.status(401).json({
          status: false,
          message:
            "Please ensure that the password and password confirmation match!",
          data: null,
        });
      }

      let hashPassword = await bcrypt.hash(password, 10);

      // Verify the token
      jwt.verify(token, process.env.JWT_SECRET_KEY, async (err, decoded) => {
        if (err) {
          return res.status(403).json({
            status: false,
            message: "Invalid or expired token!",
            data: null,
          });
        }

        // Update password for the user
        const updateUser = await prisma.user.update({
          where: { email: decoded.email },
          data: { password: hashPassword },
        });
        delete updateUser.password;
        updateUser.otpCreatedAt = formatDateTimeToUTC(updateUser.otpCreatedAt);

        const notification = await prisma.notification.create({
          data: {
            title: "Password",
            message: "Your password has been updated successfully!",
            createdAt: utcTimePlus7().toISOString(),
            user: { connect: { id: updateUser.id } },
          },
        });

        res.status(200).json({
          status: true,
          message: "Your password has been updated successfully!",
          data: updateUser,
        });
      });
    } catch (error) {
      next(error);
    }
  },
  auth: async (req, res, next) => {
    try {
      // Get user with profile data
      const userWithProfile = await prisma.user.findUnique({
        where: {
          id: req.user.id,
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
          message: "User not found",
          data: null,
        });
      }

      // Remove sensitive data
      delete userWithProfile.password;
      delete userWithProfile.otp;

      // Format dates
      if (userWithProfile.otpCreatedAt) {
        userWithProfile.otpCreatedAt = formatDateTimeToUTC(
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
        message: "User authenticated successfully",
        data: userWithProfile,
      });
    } catch (error) {
      next(error);
    }
  },
  googleOauth2: async (req, res, next) => {
    try {
      const user = req.user; // Ambil data pengguna dari request
      let token = jwt.sign(
        { id: req.user.id, password: null },
        process.env.JWT_SECRET_KEY
      );

      // Cek apakah pengguna sudah ada di database
      const userExist = await prisma.user.findUnique({
        where: { id: req.user.id },
      });

      // Jika pengguna baru, buat pengguna dan notifikasi "Selamat datang"
      if (!userExist) {
        const newUser = await prisma.user.create({
          data: {
            id: req.user.id,
            email: user.email,
            fullname: user.fullname,
            google_id: user.id,
            isVerified: true,
            profile: {
              create: {
                address: "",
                city: "",
                province: "",
                postal_code: "",
                avatar_url: user.picture || null,
              },
            },
          },
        });

        // Buat notifikasi "Selamat datang"
        await prisma.notification.create({
          data: {
            title: "Welcome",
            message: `Hello ${newUser.fullname}, welcome to our platform!`, // Gunakan newUser untuk mendapatkan fullname
            user: { connect: { id: newUser.id } }, // Hubungkan notifikasi dengan pengguna baru
            createdAt: utcTimePlus7().toISOString(), // Gunakan new Date() untuk mendapatkan waktu saat ini
          },
        });
      }

      const redirectUrl = `${FRONT_END_URL}/?token=${token}`;
      return res.redirect(redirectUrl);
    } catch (error) {
      next(error);
    }
  },

  LoginGoogle: async (req, res, next) => {
    try {
      const { access_token } = req.body;

      if (!access_token) {
        return res.status(400).json({
          status: false,
          message: "Missing required field",
          data: null,
        });
      }

      const googleData = await axios.get(
        `https://www.googleapis.com/oauth2/v3/userinfo?access_token=${access_token}`
      );

      const user = await prisma.user.upsert({
        where: {
          email: googleData?.data?.email,
        },
        update: {
          fullname: googleData?.data?.name,
          google_id: googleData?.data?.sub,
          isVerified: true,
          profile: {
            upsert: {
              create: {
                address: "",
                city: "",
                province: "",
                postal_code: "",
                avatar_url: googleData?.data?.picture || null,
              },
              update: {
                avatar_url: googleData?.data?.picture || null,
              },
            },
          },
        },
        create: {
          email: googleData?.data?.email,
          fullname: googleData?.data?.name,
          google_id: googleData?.data?.sub,
          isVerified: true,
          profile: {
            create: {
              address: "",
              city: "",
              province: "",
              postal_code: "",
              avatar_url: googleData?.data?.picture || null,
            },
          },
        },
        include: {
          profile: true,
        },
      });

      // Remove sensitive data
      delete user.password;
      delete user.otp;

      if (user.otpCreatedAt) {
        user.otpCreatedAt = formatDateTimeToUTC(user.otpCreatedAt);
      }

      if (user.profile?.birth_date) {
        user.profile.birth_date = formatDateTimeToUTC(user.profile.birth_date);
      }

      // Pastikan JWT_SECRET_KEY ada
      if (!process.env.JWT_SECRET_KEY) {
        throw new Error("JWT_SECRET_KEY is not configured");
      }

      // Buat payload yang spesifik
      const tokenPayload = {
        id: user.id,
        email: user.email,
        role: user.role,
      };

      const token = jwt.sign(tokenPayload, process.env.JWT_SECRET_KEY);

      return res.status(200).json({
        status: true,
        message: "Successfully login with Google",
        data: {
          user,
          token,
        },
      });
    } catch (error) {
      next(error);
    }
  },
};
