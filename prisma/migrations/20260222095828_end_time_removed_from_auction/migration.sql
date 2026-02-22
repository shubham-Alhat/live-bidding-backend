/*
  Warnings:

  - You are about to drop the column `endTime` on the `Auction` table. All the data in the column will be lost.
  - Made the column `startTime` on table `Auction` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Auction" DROP COLUMN "endTime",
ALTER COLUMN "startTime" SET NOT NULL;
