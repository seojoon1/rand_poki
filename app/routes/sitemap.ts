// /sitemap.xml — 색인 대상 URL 목록.
// 지금은 홈 한 장뿐이지만, 상세 라우트(/pokemon/:id 등)를 추가하면
// URLS 배열에 넣기만 하면 되도록 만들어 둔다.
import { SITE_URL } from "../lib/site";

type SitemapEntry = {
  path: string;
  changefreq?: "daily" | "weekly" | "monthly" | "yearly";
  priority?: string;
};

const URLS: SitemapEntry[] = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
];

// XML 특수문자 이스케이프 (경로에 쿼리/한글이 들어갈 경우 대비)
function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function loader() {
  const lastmod = new Date().toISOString().slice(0, 10);
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${URLS.map(
  (u) => `  <url>
    <loc>${esc(SITE_URL + u.path)}</loc>
    <lastmod>${lastmod}</lastmod>${
      u.changefreq ? `\n    <changefreq>${u.changefreq}</changefreq>` : ""
    }${u.priority ? `\n    <priority>${u.priority}</priority>` : ""}
  </url>`
).join("\n")}
</urlset>
`;

  return new Response(body, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
