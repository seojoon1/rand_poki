// PokeAPI에서 포켓몬 데이터를 긁어 정적 JSON으로 만드는 스크립트.
// 랜덤 포켓몬 뽑기 웹앱용: 세대/타입/진화단계 필터 + 다국어 이름 + 종족값.
//
// 사용법: node scripts/fetch-pokemon.mjs
// 출력:   data/pokemon.json, data/report.json
// 캐시:   .cache/{endpoint}/{key}.json (있으면 네트워크 건너뜀)
//
// 주의: 런타임에 PokeAPI를 호출하지 않는다. 빌드 타임 1회성 스크립트.

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// ── 설정 ─────────────────────────────────────────────────────────────
const BASE = "https://pokeapi.co/api/v2";
const FIRST_ID = 1;
const LAST_ID = 1025; // 전국도감 1~1025 species
const CONCURRENCY = 10; // 동시 요청 제한
const MAX_RETRY = 3; // 지수 백오프 재시도 횟수

// 스크립트 기준 프로젝트 루트 (scripts/ 의 상위)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const CACHE_DIR = path.join(ROOT, ".cache");
const DATA_DIR = path.join(ROOT, "data");

// 세대 로마숫자 → 정수 파싱용 (도감 번호 범위 하드코딩 금지)
const ROMAN = { i: 1, v: 5, x: 10, l: 50, c: 100, d: 500, m: 1000 };

// species.names[] 의 PokeAPI language.name → 우리 출력 키
// (요구 스키마: ko/en/ja/de/fr/es/it/zh. pt 키는 만들지 않는다.)
// ※ PokeAPI 는 language.name 을 소문자로 반환한다("zh-hans", "ja-hrkt").
//   매칭은 소문자로 정규화한 뒤 수행한다.
const NAME_LANG_MAP = {
  ko: "ko",
  en: "en",
  ja: "ja", // 없으면 ja-hrkt 폴백 (아래에서 별도 처리)
  de: "de",
  fr: "fr",
  es: "es",
  it: "it",
  "zh-hans": "zh",
};
const OUTPUT_LANGS = ["ko", "en", "ja", "de", "fr", "es", "it", "zh"];

// /pokemon 의 stat.name → 우리 종족값 키
const STAT_MAP = {
  hp: "hp",
  attack: "atk",
  defense: "def",
  "special-attack": "spa",
  "special-defense": "spd",
  speed: "spe",
};
const STAT_KEYS = ["hp", "atk", "def", "spa", "spd", "spe"];

// ── 세마포어 (동시 요청 제한, 직접 구현) ──────────────────────────────
class Semaphore {
  #max;
  #active = 0;
  #queue = [];
  constructor(max) {
    this.#max = max;
  }
  async acquire() {
    if (this.#active < this.#max) {
      this.#active++;
      return;
    }
    await new Promise((resolve) => this.#queue.push(resolve));
    this.#active++;
  }
  release() {
    this.#active--;
    const next = this.#queue.shift();
    if (next) next();
  }
  async run(fn) {
    await this.acquire();
    try {
      return await fn();
    } finally {
      this.release();
    }
  }
}

// ── 유틸 ─────────────────────────────────────────────────────────────
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// evolution_chain.url 등에서 마지막 숫자 id 추출: ".../evolution-chain/2/" → 2
function idFromUrl(url) {
  const m = url.match(/\/(\d+)\/?$/);
  return m ? Number(m[1]) : null;
}

// "generation-iv" → 4
function romanGenToInt(generationName) {
  const roman = generationName.split("-").pop().toLowerCase();
  let total = 0;
  let prev = 0;
  for (let i = roman.length - 1; i >= 0; i--) {
    const val = ROMAN[roman[i]];
    if (!val) return null;
    if (val < prev) total -= val;
    else {
      total += val;
      prev = val;
    }
  }
  return total;
}

// ── 캐시 있는 fetch (지수 백오프 재시도) ──────────────────────────────
// endpoint: "pokemon-species" | "pokemon" | "evolution-chain"
// key:      캐시 파일 이름(보통 id)
// transform: 네트워크 응답을 캐시에 저장하기 전 추려낼 함수 (선택)
async function fetchCached(endpoint, key, { transform } = {}) {
  const dir = path.join(CACHE_DIR, endpoint);
  const file = path.join(dir, `${key}.json`);

  // 1) 캐시 히트 시 네트워크 건너뜀
  if (existsSync(file)) {
    return JSON.parse(await readFile(file, "utf8"));
  }

  // 2) 네트워크 요청 + 지수 백오프 재시도
  const url = `${BASE}/${endpoint}/${key}`;
  let lastErr;
  for (let attempt = 0; attempt <= MAX_RETRY; attempt++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
      const json = await res.json();
      // /pokemon 응답은 moves 등으로 매우 크므로 필요한 것만 추려 저장한다.
      const toStore = transform ? transform(json) : json;
      await mkdir(dir, { recursive: true });
      await writeFile(file, JSON.stringify(toStore));
      return toStore;
    } catch (err) {
      lastErr = err;
      if (attempt < MAX_RETRY) {
        // 지수 백오프: 500ms, 1000ms, 2000ms
        await sleep(500 * 2 ** attempt);
      }
    }
  }
  throw lastErr;
}

// /pokemon/{id} 응답을 캐시에 저장할 때 필요한 필드만 남긴다 (moves 제거).
function slimPokemon(json) {
  return {
    id: json.id,
    name: json.name,
    types: json.types,
    stats: json.stats,
    // 특성: slot/숨김여부/슬러그만 (스타팅 탭에서 특성 롤에 사용)
    abilities: (json.abilities ?? []).map((a) => ({
      name: a.ability?.name,
      is_hidden: a.is_hidden,
      slot: a.slot,
    })),
  };
}

// names[] (species/ability 공통 형식) → { ko,en,ja,... } 다국어 맵.
// 비어있는 언어는 en 폴백. ja 없으면 ja-hrkt 폴백.
function extractNames(namesArr) {
  const raw = {};
  let jaHrkt = null;
  for (const n of namesArr ?? []) {
    const lang = n.language.name.toLowerCase();
    if (lang === "ja-hrkt") jaHrkt = n.name;
    const key = NAME_LANG_MAP[lang];
    if (key) raw[key] = n.name;
  }
  if (!raw.ja && jaHrkt) raw.ja = jaHrkt;
  const en = raw.en ?? null;
  const out = {};
  for (const lang of OUTPUT_LANGS) out[lang] = raw[lang] ?? en;
  return out;
}

// ── 진행률 (stderr 한 줄 갱신) ────────────────────────────────────────
function progress(label, done, total) {
  const pct = total ? ((done / total) * 100).toFixed(1) : "0.0";
  process.stderr.write(`\r${label}: ${done}/${total} (${pct}%)   `);
}
function progressDone() {
  process.stderr.write("\n");
}

// ── 진화 트리 파싱 ────────────────────────────────────────────────────
// chain 노드: { species, evolution_details[], evolves_to[] }
// 각 species 별로 정보를 수집:
//   stage:        ["base"] | ["middle"] | ["final"] | ["base","final"]
//   evolvesFrom:  직전 진화 species id (루트면 null)
//   requiresTrade: 이 species로 들어오는 진화 트리거에 trade 가 있으면 true
function walkChain(chain) {
  const bySpeciesId = new Map();

  // node: 현재 species 노드, parentId: 직전 species id (루트면 null)
  const visit = (node, parentId) => {
    const speciesId = idFromUrl(node.species.url);
    const isRoot = parentId === null;
    const isLeaf = node.evolves_to.length === 0;

    let stage;
    if (isRoot && isLeaf) {
      // 루트이면서 진화가 아예 없는 단일종 → base 이자 final
      stage = ["base", "final"];
    } else if (isRoot) {
      stage = ["base"];
    } else if (isLeaf) {
      stage = ["final"];
    } else {
      stage = ["middle"];
    }

    // 이 species로 진화해 들어온 트리거 중 trade 가 있는가.
    // (루트는 진화해 들어오는 게 없으므로 항상 false)
    const requiresTrade =
      !isRoot &&
      node.evolution_details.some((d) => d.trigger?.name === "trade");

    bySpeciesId.set(speciesId, {
      stage,
      evolvesFrom: parentId,
      requiresTrade,
    });

    // evolves_to 가 여러 갈래(이브이 등)여도 각각 재귀 처리
    for (const child of node.evolves_to) {
      visit(child, speciesId);
    }
  };

  visit(chain, null);
  return bySpeciesId;
}

// ── 메인 ─────────────────────────────────────────────────────────────
async function main() {
  const startedAt = Date.now();
  await mkdir(DATA_DIR, { recursive: true });

  const sem = new Semaphore(CONCURRENCY);
  const ids = [];
  for (let i = FIRST_ID; i <= LAST_ID; i++) ids.push(i);

  // 리포트 수집용
  const failedIds = [];
  const missingNames = []; // { id, lang }
  const statWarnings = []; // 종족값 누락 경고 id

  // ── 1단계: species + pokemon(default) 병렬 수집 ──────────────────────
  // chainId 를 먼저 알아야 evolution-chain 을 중복 없이 요청하므로,
  // 여기서 각 species 의 chainId 를 모아 둔다.
  let speciesDone = 0;
  const perId = new Map(); // id → { species, pokemon } (성공분만)
  const chainIdSet = new Set();

  await Promise.all(
    ids.map((id) =>
      sem.run(async () => {
        try {
          const species = await fetchCached("pokemon-species", id);

          // default variety 만 사용 (메가/리전폼 제외)
          const defaultVar = species.varieties.find((v) => v.is_default);
          const pokeKey = defaultVar
            ? idFromUrl(defaultVar.pokemon.url)
            : id;

          const pokemon = await fetchCached("pokemon", pokeKey, {
            transform: slimPokemon,
          });

          perId.set(id, { species, pokemon });
          const chainId = idFromUrl(species.evolution_chain.url);
          if (chainId != null) chainIdSet.add(chainId);
        } catch (err) {
          failedIds.push(id);
          process.stderr.write(`\n[실패] species/pokemon id=${id}: ${err.message}\n`);
        } finally {
          speciesDone++;
          progress("species+pokemon", speciesDone, ids.length);
        }
      })
    )
  );
  progressDone();

  // ── 2단계: evolution-chain 은 chainId 기준 1회만 요청하고 재사용 ────
  const chainIds = [...chainIdSet];
  let chainDone = 0;
  const chainInfo = new Map(); // speciesId → { stage, evolvesFrom, requiresTrade }
  const chainOf = new Map(); // speciesId → chainId

  await Promise.all(
    chainIds.map((chainId) =>
      sem.run(async () => {
        try {
          const chain = await fetchCached("evolution-chain", chainId);
          const parsed = walkChain(chain.chain);
          for (const [speciesId, info] of parsed) {
            chainInfo.set(speciesId, info);
            chainOf.set(speciesId, chainId);
          }
        } catch (err) {
          process.stderr.write(`\n[실패] evolution-chain id=${chainId}: ${err.message}\n`);
        } finally {
          chainDone++;
          progress("evolution-chain", chainDone, chainIds.length);
        }
      })
    )
  );
  progressDone();

  // ── 3단계: 조립 ─────────────────────────────────────────────────────
  const pokemonOut = [];
  const abilitySlugSet = new Set(); // 등장한 모든 특성 슬러그 (이름 수집용)
  for (const id of ids) {
    const entry = perId.get(id);
    if (!entry) continue; // 수집 실패분은 스킵 (failedIds 에 이미 기록)
    const { species, pokemon } = entry;

    // names: species.names[] 매핑 + 폴백 처리
    const rawNames = {}; // 우리 키 → 이름 (직접 매핑된 것만)
    let jaHrkt = null;
    for (const n of species.names) {
      const lang = n.language.name.toLowerCase();
      if (lang === "ja-hrkt") jaHrkt = n.name;
      const outKey = NAME_LANG_MAP[lang];
      if (!outKey) continue;
      rawNames[outKey] = n.name;
    }
    // ja 없으면 ja-hrkt 폴백
    if (!rawNames.ja && jaHrkt) rawNames.ja = jaHrkt;

    const names = {};
    const enName = rawNames.en ?? species.name; // 최후의 보루
    for (const lang of OUTPUT_LANGS) {
      if (rawNames[lang]) {
        names[lang] = rawNames[lang];
      } else {
        // 비어있으면 en 폴백 + 리포트 기록 (en 자체는 폴백 대상 아님)
        names[lang] = enName;
        if (lang !== "en") missingNames.push({ id, lang });
      }
    }

    // types: slot 순서대로 (길이 1 또는 2)
    const types = [...pokemon.types]
      .sort((a, b) => a.slot - b.slot)
      .map((t) => t.type.name);

    // stats: base_stat 매핑 + total 직접 계산
    const stats = {};
    for (const s of pokemon.stats) {
      const key = STAT_MAP[s.stat.name];
      if (key) stats[key] = s.base_stat;
    }
    const missingStat = STAT_KEYS.filter((k) => stats[k] == null);
    if (missingStat.length) {
      statWarnings.push(id);
      process.stderr.write(
        `\n[경고] id=${id} 종족값 누락: ${missingStat.join(", ")}\n`
      );
      // 누락분은 0 으로 채워 total 계산이 깨지지 않게 함
      for (const k of missingStat) stats[k] = 0;
    }
    stats.total = STAT_KEYS.reduce((sum, k) => sum + stats[k], 0);

    // abilities: slot 순서대로 [{ slug, isHidden }]
    const abilities = [...(pokemon.abilities ?? [])]
      .filter((a) => a.name)
      .sort((a, b) => a.slot - b.slot)
      .map((a) => ({ slug: a.name, isHidden: !!a.is_hidden }));
    for (const a of abilities) abilitySlugSet.add(a.slug);

    // gen: generation.name 로마숫자 파싱
    const gen = romanGenToInt(species.generation.name);

    // dex: pokedex_numbers[] 평탄화 { 도감slug: 엔트리번호 }
    const dex = {};
    for (const p of species.pokedex_numbers) {
      dex[p.pokedex.name] = p.entry_number;
    }

    // 진화 정보 (chain 파싱 결과). chain 요청 실패 시 안전 기본값.
    const ci = chainInfo.get(id) ?? {
      stage: ["base", "final"],
      evolvesFrom: null,
      requiresTrade: false,
    };
    const chainId = chainOf.get(id) ?? idFromUrl(species.evolution_chain.url);

    pokemonOut.push({
      id,
      slug: species.name,
      names,
      types,
      gen,
      chainId,
      stage: ci.stage,
      evolvesFrom: ci.evolvesFrom,
      isLegendary: species.is_legendary,
      isMythical: species.is_mythical,
      isBaby: species.is_baby,
      requiresTrade: ci.requiresTrade,
      stats,
      abilities,
      dex,
    });
  }

  // id 오름차순 보장
  pokemonOut.sort((a, b) => a.id - b.id);

  const generatedAt = new Date().toISOString();
  const output = {
    generatedAt,
    count: pokemonOut.length,
    pokemon: pokemonOut,
  };
  await writeFile(
    path.join(DATA_DIR, "pokemon.json"),
    JSON.stringify(output, null, 2)
  );

  // ── 3.5단계: 특성 다국어 이름 수집 → data/abilities.json ────────────
  // 특성은 여러 포켓몬이 공유하므로 슬러그 기준 1회만 요청한다.
  const abilitySlugs = [...abilitySlugSet].sort();
  const abilityNames = {}; // slug → { ko,en,ja,... }
  let abDone = 0;
  await Promise.all(
    abilitySlugs.map((slug) =>
      sem.run(async () => {
        try {
          const ab = await fetchCached("ability", slug, {
            transform: (j) => ({ name: j.name, names: j.names }),
          });
          abilityNames[slug] = extractNames(ab.names);
        } catch (err) {
          abilityNames[slug] = null; // 실패 시 null (UI 에서 슬러그 폴백)
          process.stderr.write(`\n[실패] ability ${slug}: ${err.message}\n`);
        } finally {
          abDone++;
          progress("ability", abDone, abilitySlugs.length);
        }
      })
    )
  );
  progressDone();
  await writeFile(
    path.join(DATA_DIR, "abilities.json"),
    JSON.stringify(abilityNames, null, 2)
  );

  // ── 4단계: 리포트 + 검증 스팟체크 ──────────────────────────────────
  const durationMs = Date.now() - startedAt;

  // 세대별 카운트
  const genCounts = {};
  for (const p of pokemonOut) genCounts[p.gen] = (genCounts[p.gen] ?? 0) + 1;

  // stage 분포 (배열 조합을 키로)
  const stageDist = {};
  for (const p of pokemonOut) {
    const key = p.stage.join("+");
    stageDist[key] = (stageDist[key] ?? 0) + 1;
  }

  // requiresTrade 총 개수
  const tradeCount = pokemonOut.filter((p) => p.requiresTrade).length;

  // 종족값 총합 분포
  const totals = pokemonOut.map((p) => p.stats.total);
  const totalMin = Math.min(...totals);
  const totalMax = Math.max(...totals);
  const totalAvg =
    Math.round((totals.reduce((a, b) => a + b, 0) / totals.length) * 100) / 100;
  const byTotalDesc = [...pokemonOut].sort(
    (a, b) => b.stats.total - a.stats.total
  );
  const top10 = byTotalDesc.slice(0, 10).map((p) => ({
    id: p.id,
    slug: p.slug,
    total: p.stats.total,
  }));
  const bottom10 = byTotalDesc
    .slice(-10)
    .reverse()
    .map((p) => ({ id: p.id, slug: p.slug, total: p.stats.total }));

  // 스팟체크 (실패 시 경고 출력 후 계속)
  const spotChecks = [];
  const check = (name, pass, detail) => {
    spotChecks.push({ name, pass, detail });
    if (!pass) process.stderr.write(`[스팟체크 실패] ${name}: ${detail}\n`);
  };
  const find = (id) => pokemonOut.find((p) => p.id === id);

  check("총 개수 1025", pokemonOut.length === 1025, `count=${pokemonOut.length}`);

  const expectedGen = [151, 100, 135, 107, 156, 72, 88, 96, 120];
  const actualGen = expectedGen.map((_, i) => genCounts[i + 1] ?? 0);
  check(
    "세대별 카운트 151/100/135/107/156/72/88/96/120",
    expectedGen.every((v, i) => v === actualGen[i]),
    `actual=${actualGen.join("/")}`
  );

  const mewtwo = find(150);
  check(
    "뮤츠(150).total === 680 && isLegendary",
    !!mewtwo && mewtwo.stats.total === 680 && mewtwo.isLegendary === true,
    mewtwo ? `total=${mewtwo.stats.total} legendary=${mewtwo.isLegendary}` : "없음"
  );

  const magikarp = find(129);
  check(
    "잉어킹(129).atk === 10",
    !!magikarp && magikarp.stats.atk === 10,
    magikarp ? `atk=${magikarp.stats.atk}` : "없음"
  );

  const alakazam = find(65);
  check(
    "후딘(65).requiresTrade === true",
    !!alakazam && alakazam.requiresTrade === true,
    alakazam ? `requiresTrade=${alakazam.requiresTrade}` : "없음"
  );

  const eevee = find(133);
  const eeveelutions = [134, 135, 136, 196, 197, 470, 471, 700];
  const eeveeOk =
    !!eevee &&
    eevee.stage.length === 1 &&
    eevee.stage[0] === "base" &&
    eeveelutions.every((eid) => {
      const e = find(eid);
      return e && e.stage.length === 1 && e.stage[0] === "final";
    });
  check(
    "이브이(133) stage=[base], 8종 진화형 전부 [final]",
    eeveeOk,
    eevee ? `eevee=${JSON.stringify(eevee.stage)}` : "없음"
  );

  const ditto = find(132);
  check(
    "메타몽(132) stage=[base,final]",
    !!ditto && ditto.stage.join("+") === "base+final",
    ditto ? `stage=${JSON.stringify(ditto.stage)}` : "없음"
  );

  const badTypes = pokemonOut
    .filter((p) => p.types.length < 1 || p.types.length > 2)
    .map((p) => p.id);
  check(
    "타입 개수 1~2",
    badTypes.length === 0,
    `위반 id=${badTypes.join(",") || "없음"}`
  );

  const report = {
    generatedAt,
    durationMs,
    durationSec: Math.round(durationMs / 100) / 10,
    requested: ids.length,
    succeeded: pokemonOut.length,
    uniqueAbilities: abilitySlugs.length,
    failedIds: failedIds.sort((a, b) => a - b),
    missingNames,
    statWarnings,
    genCounts,
    stageDistribution: stageDist,
    requiresTradeCount: tradeCount,
    statTotal: {
      min: totalMin,
      max: totalMax,
      avg: totalAvg,
      top10,
      bottom10,
    },
    spotChecks,
  };
  await writeFile(
    path.join(DATA_DIR, "report.json"),
    JSON.stringify(report, null, 2)
  );

  // 콘솔 요약
  const failedChecks = spotChecks.filter((c) => !c.pass).length;
  process.stderr.write(
    `\n완료: ${pokemonOut.length}마리, ${Math.round(durationMs / 100) / 10}s, ` +
      `실패 ${failedIds.length}, 스팟체크 ${spotChecks.length - failedChecks}/${spotChecks.length} 통과\n`
  );
  process.stderr.write("→ data/pokemon.json, data/report.json 저장됨\n");
}

main().catch((err) => {
  process.stderr.write(`\n[치명적 오류] ${err.stack || err}\n`);
  process.exit(1);
});
