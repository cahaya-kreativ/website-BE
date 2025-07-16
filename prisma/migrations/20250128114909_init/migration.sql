-- CreateEnum
CREATE TYPE "Role" AS ENUM ('user', 'admin', 'karyawan');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "fullname" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phoneNumber" TEXT,
    "password" TEXT,
    "google_id" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "role" "Role" NOT NULL DEFAULT 'user',
    "avatar_url" TEXT,
    "family_name" TEXT,
    "otp" TEXT,
    "otpCreatedAt" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
