// 필터 조건 ↔ URL 쿼리스트링 직렬화 (순수 함수).
// 결과 id 는 절대 넣지 않는다. 조건만 공유 가능하게.

import type { FilterOptions, PokemonType, Stage } from "../../src/lib/filter";
import {
  ALL_GENS,
  ALL_TYPES,
  ALL_STAGES,
  STAT_TOTAL_MIN,
  STAT_TOTAL_MAX,
} from "./pokedex";

// 기본 필터: 세대/타입/단계 전부 켜짐, 종족값 무제한
export function defaultFilters(): FilterOptions {
  return {
    gens: new Set<number>(ALL_GENS),
    types: new Set<PokemonType>(ALL_TYPES),
    typeMode: "any",
    dualOnly: false,
    stages: new Set<Stage>(ALL_STAGES),
    statTotal: undefined,
    excludeLegendary: false,
    uniqueChain: false,
  };
}

// 집합을 "." 로 이어붙인다 (전체면 생략 목적의 판정은 호출측에서)
const joinSet = (s: Iterable<string | number>) => [...s].join(".");

// ── 직렬화: 기본값과 같은 항목은 생략해 URL 을 짧게 유지 ─────────────
export function filtersToSearch(f: FilterOptions): string {
  const p = new URLSearchParams();

  // 전체 선택이 아니면 기록
  if (f.gens.size !== ALL_GENS.length) p.set("g", joinSet(f.gens));
  if (f.types.size !== ALL_TYPES.length) p.set("t", joinSet(f.types));
  if (f.typeMode === "exact") p.set("tm", "exact");
  if (f.dualOnly) p.set("dual", "1");
  if (f.stages.size !== ALL_STAGES.length) p.set("s", joinSet(f.stages));
  if (f.statTotal) p.set("st", `${f.statTotal[0]}-${f.statTotal[1]}`);
  if (f.excludeLegendary) p.set("nol", "1");
  if (f.uniqueChain) p.set("uc", "1");

  const q = p.toString();
  return q ? `?${q}` : "";
}

// 정수 파싱 헬퍼
const toInts = (v: string | null): number[] =>
  v ? v.split(".").map(Number).filter((n) => Number.isFinite(n)) : [];

// ── 역직렬화: 없는 항목은 기본값(전체 켜짐) 사용 ─────────────────────
export function searchToFilters(search: string): FilterOptions {
  const f = defaultFilters();
  const p = new URLSearchParams(
    search.startsWith("?") ? search.slice(1) : search
  );

  if (p.has("g")) f.gens = new Set(toInts(p.get("g")));
  if (p.has("t")) {
    const valid = new Set<string>(ALL_TYPES);
    f.types = new Set(
      (p.get("t") ?? "")
        .split(".")
        .filter((x) => valid.has(x)) as PokemonType[]
    );
  }
  if (p.get("tm") === "exact") f.typeMode = "exact";
  if (p.get("dual") === "1") f.dualOnly = true;
  if (p.has("s")) {
    const valid = new Set<string>(ALL_STAGES);
    f.stages = new Set(
      (p.get("s") ?? "").split(".").filter((x) => valid.has(x)) as Stage[]
    );
  }
  if (p.has("st")) {
    const m = (p.get("st") ?? "").match(/^(\d+)-(\d+)$/);
    if (m) {
      const lo = Math.max(STAT_TOTAL_MIN, Number(m[1]));
      const hi = Math.min(STAT_TOTAL_MAX, Number(m[2]));
      if (lo <= hi) f.statTotal = [lo, hi];
    }
  }
  if (p.get("nol") === "1") f.excludeLegendary = true;
  if (p.get("uc") === "1") f.uniqueChain = true;

  return f;
}
