import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  // 검색엔진용 리소스 라우트. 도메인이 site.ts 에서 오므로 정적 파일 대신 라우트로 둔다.
  route("robots.txt", "routes/robots.ts"),
  route("sitemap.xml", "routes/sitemap.ts"),
] satisfies RouteConfig;
