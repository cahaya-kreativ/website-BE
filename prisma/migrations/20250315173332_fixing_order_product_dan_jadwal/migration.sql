/*
  Warnings:

  - Added the required column `endTime` to the `schedules` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `time` on the `schedules` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "products" ADD COLUMN     "duration" INTEGER NOT NULL DEFAULT 2;

-- AlterTable
ALTER TABLE "schedules" ADD COLUMN     "endTime" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "date" SET DATA TYPE TIMESTAMP(3),
DROP COLUMN "time",
ADD COLUMN     "time" TIMESTAMP(3) NOT NULL;
