import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.APP_URL ?? "http://localhost:3000";
  return {
    rules: [{ userAgent: "*", allow: ["/$", "/privacy", "/terms", "/signup", "/login"], disallow: ["/feed", "/search", "/c/", "/p/", "/candidate", "/employer", "/admin", "/api/"] }],
    sitemap: `${base}/sitemap.xml`,
  };
}
