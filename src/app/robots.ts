import type { MetadataRoute } from "next";

const baseUrl =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "http://localhost:3000";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/pricing", "/auth"],
      disallow: ["/api/", "/admin", "/settings"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
