-- AlterTable
ALTER TABLE "IntroRequest" ADD COLUMN     "candidateEmailedAt" TIMESTAMP(3),
ADD COLUMN     "candidateReadAt" TIMESTAMP(3),
ADD COLUMN     "chatClosedAt" TIMESTAMP(3),
ADD COLUMN     "chatClosedBy" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "employerEmailedAt" TIMESTAMP(3),
ADD COLUMN     "employerReadAt" TIMESTAMP(3),
ADD COLUMN     "lastMessageAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Report" ADD COLUMN     "requestId" TEXT;

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Message_requestId_createdAt_idx" ON "Message"("requestId", "createdAt");

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "IntroRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
