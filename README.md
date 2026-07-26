# Welcome to React Router!

A modern, production-ready template for building full-stack React applications using React Router.

[![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/remix-run/react-router-templates/tree/main/default)

## Features

- 🚀 Server-side rendering
- ⚡️ Hot Module Replacement (HMR)
- 📦 Asset bundling and optimization
- 🔄 Data loading and mutations
- 🔒 TypeScript by default
- 🎉 TailwindCSS for styling
- 📖 [React Router docs](https://reactrouter.com/)

## Getting Started

### Installation

Install the dependencies:

```bash
npm install
```

### Development

Start the development server with HMR:

```bash
npm run dev
```

Your application will be available at `http://localhost:5173`.

## Building for Production

Create a production build:

```bash
npm run build
```

## Deployment

### Docker Deployment

To build and run using Docker:

```bash
docker build -t my-app .

# Run the container
docker run -p 3000:3000 my-app
```

The containerized application can be deployed to any platform that supports Docker, including:

- AWS ECS
- Google Cloud Run
- Azure Container Apps
- Digital Ocean App Platform
- Fly.io
- Railway

## 검색 노출 (SEO) 설정

배포 전에 아래를 반드시 확인한다.

### 1. 도메인

배포 주소는 `https://rand-poki.vercel.app` 이며
[`app/lib/site.ts`](app/lib/site.ts) 의 `SITE_URL` 에 기본값으로 들어 있다.
canonical · sitemap · robots · OG 태그가 전부 이 값을 참조한다.

커스텀 도메인을 붙이거나 프리뷰 배포에서 다른 주소를 써야 하면 빌드 시 주입한다.

```bash
VITE_SITE_URL=https://실제도메인 npm run build
```

환경변수는 빌드 타임에 인라인되므로 **런타임이 아니라 빌드 시점에** 주입해야 한다.

### 2. 공유 미리보기 이미지

[`public/og.svg`](public/og.svg) 가 원본 카드(1200×630)다. 카카오톡·네이버·트위터
크롤러는 SVG 를 지원하지 않으므로 PNG 로 변환해 `public/og.png` 로 저장해야
미리보기가 뜬다.

```bash
npx svgexport public/og.svg public/og.png 1200:630
```

### 3. 포털 등록 (코드로 못 하는 부분)

배포 후 직접 해야 한다.

- **네이버** — [서치어드바이저](https://searchadvisor.naver.com)에 사이트 등록 →
  소유확인 HTML 파일을 `public/` 에 넣고 재배포 → 사이트맵(`/sitemap.xml`) 제출
- **구글** — [Search Console](https://search.google.com/search-console) 등록 →
  소유확인 → 사이트맵 제출
- **다음** — [검색 등록](https://register.search.daum.net)

`/robots.txt` 는 네이버(`Yeti`)·다음(`Daumoa`) 크롤러를 명시적으로 허용해 두었다.

### 4. 제공 중인 것

- `/robots.txt`, `/sitemap.xml` — 리소스 라우트로 생성 ([`app/routes/`](app/routes/))
- canonical, Open Graph, Twitter 카드, JSON-LD(`WebApplication`) — [`app/routes/home.tsx`](app/routes/home.tsx) 의 `meta()`
- `<html lang="ko">`

### DIY Deployment

If you're familiar with deploying Node applications, the built-in app server is production-ready.

Make sure to deploy the output of `npm run build`

```
├── package.json
├── package-lock.json (or pnpm-lock.yaml, or bun.lockb)
├── build/
│   ├── client/    # Static assets
│   └── server/    # Server-side code
```

## Styling

This template comes with [Tailwind CSS](https://tailwindcss.com/) already configured for a simple default starting experience. You can use whatever CSS framework you prefer.

---

Built with ❤️ using React Router.
