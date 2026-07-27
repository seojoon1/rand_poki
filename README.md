<div align="center">

<img src="public/sprites/25.png" width="80" alt="피카츄">
<img src="public/sprites/6.png" width="80" alt="리자몽">
<img src="public/sprites/9.png" width="80" alt="거북왕">
<img src="public/sprites/3.png" width="80" alt="이상해꽃">
<img src="public/sprites/150.png" width="80" alt="뮤츠">

# 랜덤 포켓몬 뽑기

**세대 · 타입 · 종족값을 정해두고 랜덤으로 파티를 굴린다.**
마음에 드는 한 마리는 스타팅으로 데려가 개체값 · 성격 · 특성까지 돌린다.

### [▶ rand-poki.vercel.app](https://rand-poki.vercel.app)

<sub>
전국도감 1~1025번 · 8개국어 · 도트 이미지 전부 내장 —
런타임에 외부 API를 한 번도 부르지 않는다
</sub>

<br>

![React Router](https://img.shields.io/badge/React_Router_v8-CA4245?logo=reactrouter&logoColor=white)
![React](https://img.shields.io/badge/React_19-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind_v4-06B6D4?logo=tailwindcss&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-000000?logo=vercel&logoColor=white)

</div>

---

## 🎲 이런 걸 한다

**조건을 걸고 뽑는다**
세대(1~9) · 타입 18종(`아무거나`/`정확히`) · 2타입만 · 진화 단계 · 종족값 총합 범위 ·
전설/환상 제외 · 같은 진화 계열 중복 방지. 조건에 맞는 마리 수가 실시간으로 보인다.

**조건을 바꿔도 뽑은 건 안 날아간다**
재추첨은 버튼을 눌러야 일어난다. 필터를 이리저리 만져봐도 파티는 그대로다.

**카드 단위로 손본다**
파티는 최대 6마리. 마음에 안 드는 카드만 🎲 리롤하거나 ✕ 삭제한다.
특정 포켓몬을 꽂고 싶으면 **직접 추가** — 이름 · 도감번호는 물론
**초성**으로도 찾는다 (`ㅍㅋㅊ` → 피카츄).

**스타팅을 정한다**
특성 · 개체값 6종 · 성격을 하나씩 돌리거나 직접 지정하고,
레벨 50 실능력치를 막대로 본다. 돌릴 때는 슬롯머신처럼 스핀하고 소리도 난다
(오디오 파일 없이 Web Audio로 합성).

**링크로 공유한다**
필터 조건이 주소에 담긴다. 결과는 안 담기니 같은 조건으로 각자 뽑으면 된다.

<sub>표시 옵션에서 언어 8종 · 도트 이미지 · 도감번호 · 타입 · 종족값을 즉시 끄고 켤 수 있다.
첫 방문에는 사용 설명서가 한 번 뜨고, 이후엔 `? 사용법` 버튼으로 다시 연다.</sub>

---

## 🛠 만들기

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
| `npm run fetch:sprites` | 도트 이미지 내려받기 |

---

<details>
<summary><b>📁 구조와 설계 원칙</b></summary>

<br>

```
app/
  routes/
    home.tsx           탭 3개(뽑기/스타팅/설정)를 관리하는 단일 화면
    robots.ts          /robots.txt  (리소스 라우트)
    sitemap.ts         /sitemap.xml (리소스 라우트)
  components/          FilterPanel · PokemonCard · StarterPanel · DirectAddPicker · Sprite …
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
public/sprites/        fetch-sprites.mjs 산출물 — 도트 이미지 1025장 (커밋됨)
scripts/fetch-pokemon.mjs
scripts/fetch-sprites.mjs
```

- **순수 로직은 React 밖에.** `src/lib`, `app/lib/{appState,urlFilters,hangul}` 는 DOM에
  의존하지 않는 순수 모듈이고, 테스트는 이들만 대상으로 한다
- **결과는 id 배열로만 저장한다.** 포켓몬 객체를 복사해 상태에 넣지 않고 렌더 시점에 조회한다
- **조건 변경 ≠ 재추첨.** 이 불변식은 [`appState.test.ts`](app/lib/appState.test.ts)에서 검증한다
- **디자인 토큰만 사용.** 강조색은 [`app/app.css`](app/app.css)의 `accent-*` 토큰을 쓰고
  컴포넌트에서 특정 색(emerald 등)을 직접 지정하지 않는다. 다크 모드는 `prefers-color-scheme` 자동 전환

</details>

<details>
<summary><b>🔄 데이터 갱신</b></summary>

<br>

```bash
node scripts/fetch-pokemon.mjs
```

PokeAPI에서 1~1025번을 긁어 `data/pokemon.json` · `data/abilities.json` ·
`data/report.json`을 만든다. `.cache/`에 응답을 남기므로 재실행은 네트워크를 타지 않는다.
**빌드 타임 1회성 스크립트이며, 앱 런타임은 PokeAPI를 호출하지 않는다.**

산출물은 커밋되어 있으므로 새 세대가 나오는 등 데이터가 바뀔 때만 실행하면 된다.
`data/report.json`에서 실패 id·누락 이름·이상 종족값을 확인할 수 있다.

### 도트 스프라이트

```bash
npm run fetch:sprites
```

PokeAPI 스프라이트 저장소에서 `front_default` 도트(96×96)를 받아
`public/sprites/{id}.png`로 저장한다 (1025장, 약 3MB). 이미 있는 파일은 건너뛴다.
이것도 빌드 타임 1회성이며 산출물이 커밋되어 있다 — 앱은 자기 도메인의 정적 파일만 쓴다.

</details>

<details>
<summary><b>🔍 검색 노출 (SEO)</b></summary>

<br>

**1. 도메인** — 배포 주소는 `https://rand-poki.vercel.app` 이며
[`app/lib/site.ts`](app/lib/site.ts)의 `SITE_URL`에 기본값으로 들어 있다.
canonical · sitemap · robots · OG 태그가 전부 이 값을 참조한다.
커스텀 도메인을 붙이거나 프리뷰 배포에서 다른 주소를 쓰려면 빌드 시 주입한다.

```bash
VITE_SITE_URL=https://실제도메인 npm run build
```

환경변수는 빌드 타임에 인라인되므로 **런타임이 아니라 빌드 시점에** 주입해야 한다.

**2. 공유 미리보기 이미지** — [`public/og.svg`](public/og.svg)가 원본 카드(1200×630)다.
카카오톡·네이버·트위터 크롤러는 SVG를 지원하지 않으므로 PNG로 변환해
`public/og.png`로 저장해야 미리보기가 뜬다.

```bash
npx svgexport public/og.svg public/og.png 1200:630
```

**3. 포털 등록** (코드로 못 하는 부분, 배포 후 직접)

- **네이버** — [서치어드바이저](https://searchadvisor.naver.com)에 사이트 등록 →
  소유확인 HTML 파일을 `public/`에 넣고 재배포 → 사이트맵(`/sitemap.xml`) 제출
- **구글** — [Search Console](https://search.google.com/search-console) 등록 → 소유확인 → 사이트맵 제출
- **다음** — [검색 등록](https://register.search.daum.net)

`/robots.txt`는 네이버(`Yeti`)·다음(`Daumoa`) 크롤러를 명시적으로 허용해 두었다.

**4. 이미 적용된 것** — `<html lang="ko">` · canonical · Open Graph · Twitter 카드 ·
JSON-LD(`WebApplication`) · `/robots.txt` · `/sitemap.xml`

</details>

<details>
<summary><b>🚀 배포</b></summary>

<br>

[`react-router.config.ts`](react-router.config.ts)에서 `ssr: true`로 서버 렌더링을 쓴다.
`/robots.txt`와 `/sitemap.xml`은 **서버 라우트**라서 정적 호스팅만으로는 404가 나므로,
배포 후 두 주소가 실제로 열리는지 확인할 것.
(Vercel에 SSR로 올릴 때 `@vercel/react-router` 프리셋이 필요할 수 있는데 현재 설정에는 없다.)

Docker로도 띄울 수 있다.

```bash
docker build -t rand-poki .
docker run -p 3000:3000 rand-poki
```

</details>

<details>
<summary><b>📌 알려진 과제</b></summary>

<br>

- **클라이언트 번들이 크다.** `data/pokemon.json`(1.2MB)을 통째로 번들에 인라인해서
  홈 청크가 650KB 남짓이다. 필터에 필요한 필드만 추린 경량 인덱스로 줄일 여지가 있다
- **색인 대상 URL이 홈 하나뿐이다.** 검색 유입을 늘리려면 `/pokemon/:id` 같은 상세 라우트를
  만들어 프리렌더하는 편이 좋다. 만들 경우 [`app/routes/sitemap.ts`](app/routes/sitemap.ts)의
  `URLS` 배열에 추가하면 된다
- 설정 탭은 아직 자리만 잡혀 있다
- 초성 검색은 부분 일치라 `ㄹㅈ`가 `깨비드릴조`도 잡는다 (`ㅅㅎ`로 `이상해씨`를 찾는 것과 같은 성질)

</details>

---

<div align="center">
<sub>

이미지·데이터 출처 [PokeAPI](https://pokeapi.co) · 포켓몬 및 관련 상표는 닌텐도/게임프리크/크리처스의 자산이며
이 프로젝트는 비영리 팬메이드다

**made by [seojoon1](https://github.com/seojoon1)**

</sub>
</div>
