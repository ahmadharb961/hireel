-- AlterTable
ALTER TABLE "Block" ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'block';

-- AlterTable
ALTER TABLE "CandidateProfile" ADD COLUMN     "desiredRoles" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "jobTypes" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "relocateTo" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "salaryCurrency" TEXT NOT NULL DEFAULT 'USD',
ADD COLUMN     "salaryMin" INTEGER,
ADD COLUMN     "workModes" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "IntroRequest" ADD COLUMN     "shareSalary" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "HiddenCompanyName" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "term" TEXT NOT NULL,
    "match" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HiddenCompanyName_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HiddenCompanyName_match_idx" ON "HiddenCompanyName"("match");

-- CreateIndex
CREATE UNIQUE INDEX "HiddenCompanyName_candidateId_match_key" ON "HiddenCompanyName"("candidateId", "match");

-- AddForeignKey
ALTER TABLE "HiddenCompanyName" ADD CONSTRAINT "HiddenCompanyName_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "CandidateProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
