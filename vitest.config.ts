import { defineConfig } from "vitest/config";

// 테스트는 순수 로직 모듈만 대상으로 한다.
// (React Router vite 플러그인은 테스트에 불필요하고 로드 시 실패하므로 제외)
export default defineConfig({
  test: {
    include: ["src/**/*.test.ts", "app/**/*.test.ts"],
    environment: "node",
  },
});
