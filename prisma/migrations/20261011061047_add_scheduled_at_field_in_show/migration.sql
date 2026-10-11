/*
  Warnings:

  - Added the required column `scheduledAt` to the `Show` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Show" ADD COLUMN     "scheduledAt" TIMESTAMPTZ(3) NOT NULL;
