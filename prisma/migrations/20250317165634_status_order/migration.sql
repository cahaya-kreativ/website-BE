/*
  Warnings:

  - The values [pending,cancel] on the enum `OrderStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "OrderStatus_new" AS ENUM ('unpaid', 'process', 'done', 'cancelled');
ALTER TABLE "orders" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "orders" ALTER COLUMN "status" TYPE "OrderStatus_new" USING ("status"::text::"OrderStatus_new");
ALTER TYPE "OrderStatus" RENAME TO "OrderStatus_old";
ALTER TYPE "OrderStatus_new" RENAME TO "OrderStatus";
DROP TYPE "OrderStatus_old";
ALTER TABLE "orders" ALTER COLUMN "status" SET DEFAULT 'unpaid';
COMMIT;

-- AlterTable
ALTER TABLE "orders" ALTER COLUMN "status" SET DEFAULT 'unpaid';
