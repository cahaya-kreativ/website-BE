/*
  Warnings:

  - You are about to drop the column `birth_day` on the `profiles` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "profiles" DROP COLUMN "birth_day",
ADD COLUMN     "birth_date" TIMESTAMP(3);
