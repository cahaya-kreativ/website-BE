/*
  Warnings:

  - You are about to drop the column `image` on the `portfolios` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('IMAGE', 'VIDEO');

-- AlterTable
ALTER TABLE "portfolios" DROP COLUMN "image";

-- CreateTable
CREATE TABLE "portfolio_media" (
    "id" SERIAL NOT NULL,
    "url" TEXT NOT NULL,
    "type" "MediaType" NOT NULL,
    "portfolio_id" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "portfolio_media_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "portfolio_media" ADD CONSTRAINT "portfolio_media_portfolio_id_fkey" FOREIGN KEY ("portfolio_id") REFERENCES "portfolios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
