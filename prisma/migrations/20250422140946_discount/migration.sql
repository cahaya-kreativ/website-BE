-- AlterTable
ALTER TABLE "order_details" ADD COLUMN     "discount" DECIMAL(10,2);

-- CreateTable
CREATE TABLE "discounts" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "percentage" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "discounts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "discounts_code_key" ON "discounts"("code");
