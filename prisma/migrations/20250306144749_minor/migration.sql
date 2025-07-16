/*
  Warnings:

  - The values [karyawan] on the enum `Role` will be removed. If these variants are still used in the database, this will fail.

*/
-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('unpaid', 'paid', 'cancelled');

-- AlterEnum
BEGIN;
CREATE TYPE "Role_new" AS ENUM ('user', 'admin', 'employee');
ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "users" ALTER COLUMN "role" TYPE "Role_new" USING ("role"::text::"Role_new");
ALTER TYPE "Role" RENAME TO "Role_old";
ALTER TYPE "Role_new" RENAME TO "Role";
DROP TYPE "Role_old";
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'user';
COMMIT;

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "status" "PaymentStatus" NOT NULL DEFAULT 'unpaid';
