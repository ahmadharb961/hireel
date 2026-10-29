-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "featuredRank" INTEGER,
ADD COLUMN     "phone" TEXT NOT NULL DEFAULT '';

-- CreateTable
CREATE TABLE "Category" (
    "key" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("key")
);

-- The categories Hireel started with.
INSERT INTO "Category" ("key", "nameEn", "nameAr", "sortOrder") VALUES
  ('marketing', 'Marketing', 'التسويق', 10),
  ('technology', 'Technology', 'التكنولوجيا', 20),
  ('finance', 'Finance', 'المالية', 30),
  ('sales', 'Sales', 'المبيعات', 40),
  ('design', 'Design', 'التصميم', 50),
  ('hospitality', 'Hospitality', 'الضيافة', 60),
  ('engineering', 'Engineering', 'الهندسة', 70),
  ('healthcare', 'Healthcare', 'الرعاية الصحية', 80),
  ('education', 'Education', 'التعليم', 90),
  ('logistics', 'Logistics', 'اللوجستيات', 100),
  ('retail', 'Retail', 'التجزئة', 110),
  ('hr', 'HR & People', 'الموارد البشرية', 120),
  ('other', 'Other', 'أخرى', 130)
ON CONFLICT ("key") DO NOTHING;
