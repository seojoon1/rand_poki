// 사이트 전역 메타데이터. canonical·sitemap·robots·OG 태그가 모두 여기를 참조하므로
// 배포 도메인은 이 파일(또는 VITE_SITE_URL 환경변수) 한 곳만 고치면 된다.
//
// 커스텀 도메인을 붙이거나 프리뷰 배포에서 다른 주소를 쓰려면
// 빌드 시 주입한다: VITE_SITE_URL=https://example.com npm run build

const RAW_SITE_URL =
  import.meta.env.VITE_SITE_URL ?? "https://rand-poki.vercel.app";

// 뒤 슬래시를 제거해 `${SITE_URL}/path` 조합이 항상 안전하게 만든다.
export const SITE_URL = RAW_SITE_URL.replace(/\/+$/, "");

export const SITE_NAME = "랜덤 포켓몬 뽑기";

export const SITE_DESCRIPTION =
  "세대·타입·진화 단계·종족값 조건으로 랜덤 포켓몬을 뽑고, 개체값·성격·특성까지 돌려 스타팅 포켓몬을 정해보세요. 설치 없이 브라우저에서 바로 사용할 수 있습니다.";

// 카카오톡·트위터 등 공유 미리보기 이미지 (1200×630 PNG 권장).
export const OG_IMAGE = `${SITE_URL}/og.png`;

export const SITE_LOCALE = "ko_KR";
export const SITE_LANG = "ko";
