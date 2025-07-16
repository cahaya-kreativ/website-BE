/*
  Warnings:

  - Added the required column `endDate` to the `schedules` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "schedules" ADD COLUMN     "endDate" TIMESTAMP(3) NOT NULL;
