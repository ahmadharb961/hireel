-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "bannerUpdatedAt" TIMESTAMP(3),
ADD COLUMN     "facebookUrl" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "instagramUrl" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "linkedinUrl" TEXT NOT NULL DEFAULT '';

-- CreateTable
CREATE TABLE "CompanyBanner" (
    "companyId" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyBanner_pkey" PRIMARY KEY ("companyId")
);

-- AddForeignKey
ALTER TABLE "CompanyBanner" ADD CONSTRAINT "CompanyBanner_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
