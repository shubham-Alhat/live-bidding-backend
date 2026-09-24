/*
  Warnings:

  - You are about to drop the column `status` on the `Auction` table. All the data in the column will be lost.

*/
-- AlterEnum
ALTER TYPE "STATUS" ADD VALUE 'SCHEDULED';

-- AlterTable
ALTER TABLE "Auction" DROP COLUMN "status";
