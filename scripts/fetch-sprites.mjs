// PokeAPI 스프라이트 저장소에서 도트 이미지를 받아 public/sprites/ 에 넣는 스크립트.
//
// 사용법: node scripts/fetch-sprites.mjs
// 출력:   public/sprites/{id}.png (1~1025)
//
// 주의: 런타임에 외부 CDN을 때리지 않는다. fetch-pokemon.mjs 와 마찬가지로
//       빌드 타임 1회성이며, 이미 받은 파일은 건너뛴다(= 재실행이 싸다).

import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// front_default 도트. 1025번까지 전부 존재하는 유일한 경로다
// (generation-viii/icons 는 9세대가 없어 못 쓴다).
const BASE =
  "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon";
const FIRST_ID = 1;
const LAST_ID = 1025;
const CONCURRENCY = 10;
const MAX_RETRY = 3;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "public", "sprites");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function progress(label, done, total) {
  const pct = total ? ((done / total) * 100).toFixed(1) : "0.0";
  process.stderr.write(`\r${label}: ${done}/${total} (${pct}%)   `);
}

// 지수 백오프 재시도. 이미 있는 파일은 네트워크를 건너뛴다.
async function fetchSprite(id) {
  const file = path.join(OUT_DIR, `${id}.png`);
  if (existsSync(file)) return "skipped";

  let lastErr;
  for (let attempt = 0; attempt <= MAX_RETRY; attempt++) {
    try {
      const res = await fetch(`${BASE}/${id}.png`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length === 0) throw new Error("빈 응답");
      await writeFile(file, buf);
      return "fetched";
    } catch (err) {
      lastErr = err;
      if (attempt < MAX_RETRY) await sleep(500 * 2 ** attempt);
    }
  }
  throw lastErr;
}

async function main() {
  const startedAt = Date.now();
  await mkdir(OUT_DIR, { recursive: true });

  const ids = [];
  for (let i = FIRST_ID; i <= LAST_ID; i++) ids.push(i);

  const failed = [];
  let fetched = 0;
  let skipped = 0;
  let done = 0;

  // 세마포어 대신 워커 N개가 같은 큐를 나눠 먹는다 (스프라이트는 단순 다운로드).
  const queue = ids.slice();
  const worker = async () => {
    for (let id = queue.shift(); id !== undefined; id = queue.shift()) {
      try {
        const result = await fetchSprite(id);
        if (result === "fetched") fetched++;
        else skipped++;
      } catch (err) {
        failed.push(id);
        process.stderr.write(`\n[실패] sprite id=${id}: ${err.message}\n`);
      } finally {
        done++;
        progress("sprite", done, ids.length);
      }
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  process.stderr.write("\n");

  const sec = Math.round((Date.now() - startedAt) / 100) / 10;
  process.stderr.write(
    `완료: 새로 받음 ${fetched}, 건너뜀 ${skipped}, 실패 ${failed.length}, ${sec}s\n`
  );
  if (failed.length) {
    process.stderr.write(`실패 id: ${failed.sort((a, b) => a - b).join(",")}\n`);
    process.exit(1);
  }
  process.stderr.write("→ public/sprites/ 저장됨\n");
}

main().catch((err) => {
  process.stderr.write(`\n[치명적 오류] ${err.stack || err}\n`);
  process.exit(1);
});
