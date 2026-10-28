import { z } from "zod";
import { AVAILABILITY, COMPANY_SIZES, EMPLOYMENT_TYPES, INDUSTRIES, MAX_SKILLS, VIDEO_LANGUAGES } from "./constants";

/** Error messages are translation keys (messages → errors.*), not English text. */
const text = (max: number) => z.string().trim().max(max, "too_long");
const required = (max: number) => text(max).min(1, "required");

export const emailSchema = z.string().trim().toLowerCase().max(200).email("email");
export const passwordSchema = z.string().min(8, "password_short").max(128, "too_long");

export const candidateSignUpSchema = z.object({
  firstName: required(60),
  lastName: required(60),
  email: emailSchema,
  password: passwordSchema,
  country: required(60),
  agree: z.literal("on", { message: "agree" }),
});

export const employerSignUpSchema = z.object({
  companyName: required(120),
  email: emailSchema,
  password: passwordSchema,
  contactName: required(100),
  position: text(100),
  industry: z.enum(INDUSTRIES, { message: "required" }),
  website: z.union([z.literal(""), z.string().trim().url("url").max(200)]),
  size: z.enum(COMPANY_SIZES, { message: "required" }),
  country: required(60),
  agree: z.literal("on", { message: "agree" }),
});

/** What an employer can change on their company profile (the name needs the Hireel team). */
export const companyProfileSchema = z.object({
  description: text(1200),
  website: z.union([z.literal(""), z.string().trim().url("url").max(200)]),
  industry: z.enum(INDUSTRIES, { message: "required" }),
  size: z.enum(COMPANY_SIZES, { message: "required" }),
  country: required(60),
  linkedinUrl: text(200),
  instagramUrl: text(200),
  facebookUrl: text(200),
});

export const profileBasicsSchema = z.object({
  fullName: required(100),
  headline: required(100),
  location: required(100),
  phone: z.union([z.literal(""), z.string().trim().regex(/^\+?[0-9 ()-]{6,20}$/, "phone")]),
});

export const profileExperienceSchema = z.object({
  currentTitle: required(100),
  industry: z.enum(INDUSTRIES, { message: "required" }),
  yearsExperience: z.coerce.number({ message: "years" }).int("years").min(0, "years").max(50, "years"),
  availability: z.enum(AVAILABILITY),
  skills: z.array(z.string().trim().min(1).max(40)).min(1, "skills_min").max(MAX_SKILLS, "skills_max"),
});

export const profileAboutSchema = z.object({
  about: text(1200),
  workHistory: text(3000),
  education: text(1500),
  contactEmail: z.union([z.literal(""), emailSchema]),
});

export const introRequestSchema = z.object({
  candidateId: z.string().min(1).max(40),
  roleTitle: required(100),
  employment: z.enum(EMPLOYMENT_TYPES),
  workLocation: text(100),
  payRange: text(80),
  message: z.string().trim().min(10, "message_short").max(1000, "too_long"),
  wantsCv: z.boolean(),
});

export const videoLanguageSchema = z.enum(VIDEO_LANGUAGES);

export function firstError(err: z.ZodError): { field: string; code: string } {
  const issue = err.issues[0];
  return { field: String(issue?.path[0] ?? ""), code: issue?.message ?? "invalid" };
}
