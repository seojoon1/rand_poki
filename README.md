# 랜덤 포켓몬 뽑기

세대 · 타입 · 진화 단계 · 종족값 조건으로 랜덤 포켓몬을 뽑고,
개체값 · 성격 · 특성까지 돌려 스타팅 포켓몬을 정하는 웹앱.

**https://rand-poki.vercel.app**

전국도감 1~1025번 데이터를 정적 JSON으로 내장하므로 런타임에 외부 API를 호출하지 않는다.

---

## 기능

### 뽑기 탭

- **필터** — 세대(1~9) · 타입(18종, `any`/`exact` 모드) · 2타입만 · 진화 단계(기본/중간/최종) ·
  종족값 총합 범위 · 전설/환상 제외 · 같은 진화 계열 중복 방지
- **조건이 바뀌어도 이미 뽑힌 결과는 그대로 둔다.** 재추첨은 버튼을 눌러야 일어난다
- 필터 조건은 URL 쿼리스트링에 직렬화되어 그대로 공유할 수 있다 (결과 자체는 넣지 않는다)
- **직접 추가** — 랜덤 대신 원하는 포켓몬을 검색해서 넣는다.
  이름 · 도감번호 · **한글 초성**(`ㅍㅋㅊ` → 피카츄)으로 찾을 수 있다
- 파티 최대 6마리, 카드별 개별 리롤
- 표시 옵션(언어 8종 · 도감번호 · 타입 · 종족값)은 즉시 반영되며 재추첨을 일으키지 않는다

### 스타팅 탭

뽑기 탭에서 카드의 **스타팅 선택**을 누르면 넘어온다.

- 특성 · 개체값 6종 · 성격을 **하나씩** 돌리거나 직접 지정
- 돌릴 때 슬롯머신식 스핀 애니메이션 + 효과음
- 레벨 50 기준 실능력치를 기본/보너스 2톤 막대로 표시

효과음은 오디오 파일 없이 Web Audio로 합성한다([`app/lib/sound.ts`](app/lib/sound.ts)).
🔊 토글 상태는 `localStorage`에 남는다.

---

## 빠른 시작

> **Node 22.22 이상**이 필요하다. 그 아래에서는 `react-router` CLI가 실행을 거부한다.

```bash
npm install
npm run dev        # http://localhost:5173
```

| 스크립트 | 설명 |
| --- | --- |
| `npm run dev` | 개발 서버 (HMR) |
| `npm run build` | 프로덕션 빌드 → `build/` |
| `npm start` | 빌드 결과 서빙 |
| `npm test` | 순수 로직 단위 테스트 (vitest) |
| `npm run typecheck` | 라우트 타입 생성 + `tsc` |

---

## 구조

```
app/
  routes/
    home.tsx           탭 3개(뽑기/스타팅/설정)를 관리하는 단일 화면
    robots.ts          /robots.txt  (리소스 라우트)
    sitemap.ts         /sitemap.xml (리소스 라우트)
  components/          FilterPanel · PokemonCard · StarterPanel · DirectAddPicker …
  lib/
    appState.ts        리듀서 (앱 상태 전이의 단일 진입점)
    pokedex.ts         데이터 로딩 + 타입 색상/이름 등 UI 메타
    urlFilters.ts      필터 ↔ 쿼리스트링 직렬화
    hangul.ts          초성 검색
    sound.ts           Web Audio 효과음
    site.ts            도메인·사이트명 (SEO 태그가 모두 참조)
src/lib/
  filter.ts            필터링/추첨 (순수)
  starter.ts           개체값·성격·특성·실능력치 계산 (순수)
data/                  fetch-pokemon.mjs 산출물 (커밋됨)
scripts/fetch-pokemon.mjs
```

### 설계 원칙

- **순수 로직은 React 밖에.** `src/lib`, `app/lib/{appState,urlFilters,hangul}` 는 DOM에
  의존하지 않는 순수 모듈이고, 테스트는 이들만 대상으로 한다
- **결과는 id 배열로만 저장한다.** 포켓몬 객체를 복사해 상태에 넣지 않고 렌더 시점에 조회한다
- **조건 변경 ≠ 재추첨.** 이 불변식은 [`appState.test.ts`](app/lib/appState.test.ts)에서 검증한다
- **디자인 토큰만 사용.** 강조색은 [`app/app.css`](app/app.css)의 `accent-*` 토큰을 쓰고
  컴포넌트에서 특정 색(emerald 등)을 직접 지정하지 않는다. 다크 모드는 `prefers-color-scheme` 자동 전환

---

## 데이터 갱신

```bash
node scripts/fetch-pokemon.mjs
```

PokeAPI에서 1~1025번을 긁어 `data/pokemon.json` · `data/abilities.json` ·
`data/report.json`을 만든다. `.cache/`에 응답을 남기므로 재실행은 네트워크를 타지 않는다.
**빌드 타임 1회성 스크립트이며, 앱 런타임은 PokeAPI를 호출하지 않는다.**

산출물은 커밋되어 있으므로 새 세대가 나오는 등 데이터가 바뀔 때만 실행하면 된다.
`data/report.json`에서 실패 id·누락 이름·이상 종족값을 확인할 수 있다.

---

## 검색 노출 (SEO)

### 1. 도메인

배포 주소는 `https://rand-poki.vercel.app` 이며 [`app/lib/site.ts`](app/lib/site.ts)의
`SITE_URL`에 기본값으로 들어 있다. canonical · sitemap · robots · OG 태그가 전부 이 값을 참조한다.

커스텀 도메인을 붙이거나 프리뷰 배포에서 다른 주소를 써야 하면 빌드 시 주입한다.

```bash
VITE_SITE_URL=https://실제도메인 npm run build
```

환경변수는 빌드 타임에 인라인되므로 **런타임이 아니라 빌드 시점에** 주입해야 한다.

### 2. 공유 미리보기 이미지

[`public/og.svg`](public/og.svg)가 원본 카드(1200×630)다. 카카오톡·네이버·트위터
크롤러는 SVG를 지원하지 않으므로 PNG로 변환해 `public/og.png`로 저장해야 미리보기가 뜬다.

```bash
npx svgexport public/og.svg public/og.png 1200:630
```

### 3. 포털 등록 (코드로 못 하는 부분)

배포 후 직접 해야 한다.

- **네이버** — [서치어드바이저](https://searchadvisor.naver.com)에 사이트 등록 →
  소유확인 HTML 파일을 `public/`에 넣고 재배포 → 사이트맵(`/sitemap.xml`) 제출
- **구글** — [Search Console](https://search.google.com/search-console) 등록 → 소유확인 → 사이트맵 제출
- **다음** — [검색 등록](https://register.search.daum.net)

`/robots.txt`는 네이버(`Yeti`)·다음(`Daumoa`) 크롤러를 명시적으로 허용해 두었다.

### 4. 이미 적용된 것

`<html lang="ko">` · canonical · Open Graph · Twitter 카드 ·
JSON-LD(`WebApplication`) · `/robots.txt` · `/sitemap.xml`

---

## 배포

[`react-router.config.ts`](react-router.config.ts)에서 `ssr: true`로 서버 렌더링을 쓴다.
`/robots.txt`와 `/sitemap.xml`은 **서버 라우트**라서 정적 호스팅만으로는 404가 나므로,
배포 후 두 주소가 실제로 열리는지 확인할 것.
(Vercel에 SSR로 올릴 때 `@vercel/react-router` 프리셋이 필요할 수 있는데 현재 설정에는 없다.)

Docker로도 띄울 수 있다.

```bash
docker build -t rand-poki .
docker run -p 3000:3000 rand-poki
```

---

## 알려진 과제

- **클라이언트 번들이 크다.** `data/pokemon.json`(1.2MB)을 통째로 번들에 인라인해서
  홈 청크가 650KB 남짓이다. 필터에 필요한 필드만 추린 경량 인덱스로 줄일 여지가 있다
- **색인 대상 URL이 홈 하나뿐이다.** 검색 유입을 늘리려면 `/pokemon/:id` 같은 상세 라우트를
  만들어 프리렌더하는 편이 좋다. 만들 경우 [`app/routes/sitemap.ts`](app/routes/sitemap.ts)의
  `URLS` 배열에 추가하면 된다
- 설정 탭은 아직 자리만 잡혀 있다
- 초성 검색은 부분 일치라 `ㄹㅈ`가 `깨비드릴조`도 잡는다 (`ㅅㅎ`로 `이상해씨`를 찾는 것과 같은 성질)
