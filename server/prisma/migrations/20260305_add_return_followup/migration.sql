-- AlterEnum
ALTER TYPE "ComputerStatus" ADD VALUE 'PENDING_RETURN';
ALTER TYPE "ComputerStatus" ADD VALUE 'PENDING_CLEANING';

-- CreateTable
CREATE TABLE "ReturnFollowup" (
    "id" TEXT NOT NULL,
    "rentalId" TEXT NOT NULL,
    "returnType" TEXT NOT NULL,
    "expectedDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "ReturnFollowup_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ReturnFollowup" ADD CONSTRAINT "ReturnFollowup_rentalId_fkey" FOREIGN KEY ("rentalId") REFERENCES "Rental"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
