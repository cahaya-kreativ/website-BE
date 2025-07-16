-- DropForeignKey
ALTER TABLE "orders" DROP CONSTRAINT "orders_schedule_id_fkey";

-- AlterTable
ALTER TABLE "orders" ALTER COLUMN "schedule_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "schedules"("id") ON DELETE SET NULL ON UPDATE CASCADE;
