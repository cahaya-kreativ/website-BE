-- CreateEnum
CREATE TYPE "CategoryGallery" AS ENUM ('wedding', 'graduation', 'event', 'sosmed');

-- AlterTable
ALTER TABLE "galleries" ADD COLUMN     "category" "CategoryGallery" NOT NULL DEFAULT 'wedding';
