/** @type {import('next-sitemap').IConfig} */
const rawSiteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://alias.app";
const siteUrl = rawSiteUrl.replace(/\/+$/, "");

module.exports = {
  siteUrl,
  generateRobotsTxt: true,
  sitemapSize: 5000,
  transform: async (config, path) => {
    const normalizedPath = path === "/" ? "" : path;

    return {
      loc: `${siteUrl}${normalizedPath}`,
      changefreq: path === "/" ? "weekly" : "monthly",
      priority: path === "/" ? 1 : 0.7,
      lastmod: new Date().toISOString(),
      alternateRefs: config.alternateRefs ?? [],
    };
  },
  robotsTxtOptions: {
    policies: [
      {
        userAgent: "*",
        allow: "/",
      },
    ],
  },
};
