-- AlterEnum
ALTER TYPE "OrderStatus" ADD VALUE 'pending';
COMMIT;

-- AlterTable
ALTER TABLE "orders" ALTER COLUMN "status" SET DEFAULT 'pending';
