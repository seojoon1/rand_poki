// /robots.txt — 정적 파일 대신 라우트로 제공한다.
// sitemap 줄에 절대 URL 이 필요한데, 그 도메인이 site.ts 한 곳에서 관리되기 때문.
import { SITE_URL } from "../lib/site";

// Yeti(네이버) · Daumoa(다음) 는 명시적으로 허용해 둔다. 국내 포털 노출이 목표라
// 기본 User-agent 규칙만 두는 것보다 의도가 분명하다.
const BODY = `User-agent: *
Allow: /

User-agent: Yeti
Allow: /

User-agent: Daumoa
Allow: /

Sitemap: ${SITE_URL}/sitemap.xml
`;

export function loader() {
  return new Response(BODY, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
