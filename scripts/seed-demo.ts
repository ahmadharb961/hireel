// DEMO DATA ONLY. Adds clearly labeled sample candidates for local testing.
// Demo profiles show a "Demo" label in the app and are removed with `npm run demo:clear`.
// Demo videos have no real video file; the app shows a placeholder for them.
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { prisma } from "../src/lib/db";
import { slugify } from "../src/lib/constants";

type Lang = "EN" | "AR" | "FR";
const people: { name: string; headline: string; years: number; location: string; industry: string; availability: string; skills: string[]; about: string; vids: { l: Lang; views: number; primary?: boolean; land?: boolean }[]; vis?: "EMPLOYERS_ONLY" }[] = [
  { name: "Lina Haddad", headline: "Digital Marketing Manager", years: 8, location: "Beirut, Lebanon", industry: "marketing", availability: "AVAILABLE_NOW", skills: ["Meta Ads", "Team leadership", "SEO"], about: "I lead performance marketing teams for retail and hospitality brands.", vids: [{ l: "EN", views: 128, primary: true }, { l: "AR", views: 31 }] },
  { name: "Karim Nassar", headline: "Senior Full-Stack Developer", years: 6, location: "Jounieh, Lebanon", industry: "technology", availability: "ONE_MONTH", skills: ["TypeScript", "React", "PostgreSQL"], about: "I build and ship web products end to end.", vids: [{ l: "EN", views: 86, primary: true }], vis: "EMPLOYERS_ONLY" },
  { name: "Maya Khoury", headline: "Finance Analyst", years: 4, location: "Tripoli, Lebanon", industry: "finance", availability: "AVAILABLE_NOW", skills: ["Financial modelling", "IFRS", "Excel"], about: "I prepare monthly reporting and budgeting models.", vids: [{ l: "AR", views: 54, primary: true }, { l: "EN", views: 6 }] },
  { name: "Omar Sleiman", headline: "Sales Executive", years: 5, location: "Dubai, UAE", industry: "sales", availability: "TWO_MONTHS", skills: ["B2B sales", "CRM", "Negotiation"], about: "I close enterprise software deals across the GCC.", vids: [{ l: "EN", views: 203, primary: true }, { l: "AR", views: 40 }] },
  { name: "Rita Aoun", headline: "UX Designer", years: 7, location: "Beirut, Lebanon", industry: "design", availability: "OPEN_TO_OFFERS", skills: ["Figma", "User research", "Design systems"], about: "I design mobile products backed by research.", vids: [{ l: "EN", views: 97, primary: true }, { l: "FR", views: 4 }] },
  { name: "Nour Saad", headline: "Junior Accountant", years: 1, location: "Saida, Lebanon", industry: "finance", availability: "AVAILABLE_NOW", skills: ["QuickBooks", "Excel", "Payroll"], about: "Recent graduate with a year of bookkeeping experience.", vids: [{ l: "AR", views: 7, primary: true, land: true }] },
];

async function main() {
  if (process.env.NODE_ENV === "production" && process.argv[2] !== "--yes-demo-in-production") {
    console.error("Refusing to add demo data in production. Pass --yes-demo-in-production if you really mean it.");
    process.exit(1);
  }
  for (const p of people) {
    const email = `demo.${slugify(p.name)}@example.com`;
    if (await prisma.user.findUnique({ where: { email } })) continue;
    const id = randomUUID();
    await prisma.user.create({
      data: {
        id, email, name: p.name, emailVerified: true, role: "CANDIDATE", isDemo: true,
        candidate: {
          create: {
            fullName: p.name, headline: p.headline, currentTitle: p.headline, location: p.location, industry: p.industry,
            yearsExperience: p.years, availability: p.availability, about: p.about, status: "PUBLISHED",
            visibility: p.vis ?? "EVERYONE", publishConsentAt: new Date(), onboardingStep: 5, isDemo: true,
            workHistory: "Demo work history", education: "Demo education",
            videos: {
              create: p.vids.map((v) => ({
                language: v.l, isPrimary: Boolean(v.primary), processing: "READY", moderation: "APPROVED",
                consentAt: new Date(), viewCount: v.views, durationSec: 60, width: v.land ? 1920 : 1080, height: v.land ? 1080 : 1920, isDemo: true,
              })),
            },
            skills: {
              create: await Promise.all(p.skills.map(async (s) => {
                const skill = await prisma.skill.upsert({ where: { slug: slugify(s) }, update: {}, create: { name: s, slug: slugify(s) } });
                return { skillId: skill.id };
              })),
            },
          },
        },
      },
    });
    console.log(`Demo candidate: ${p.name}`);
  }
  console.log("Demo data ready. Remove it any time with: npm run demo:clear");
}
main().finally(() => prisma.$disconnect());
