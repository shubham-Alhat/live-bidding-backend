/*
  Warnings:

  - You are about to drop the column `image` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `initialPrice` on the `Product` table. All the data in the column will be lost.
  - Added the required column `buyNowPrice` to the `Product` table without a default value. This is not possible if the table is not empty.
  - Added the required column `startingPrice` to the `Product` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Product" DROP COLUMN "image",
DROP COLUMN "initialPrice",
ADD COLUMN     "buyNowPrice" DECIMAL(65,30) NOT NULL,
ADD COLUMN     "images" TEXT[],
ADD COLUMN     "startingPrice" DECIMAL(65,30) NOT NULL;
