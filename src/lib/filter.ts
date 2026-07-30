// 랜덤 포켓몬 뽑기의 필터/추첨 로직 (순수 함수 모듈).
// 프레임워크 의존성 없음. 여기서 정의한 타입은 UI 레이어에서 재사용한다.

// ── 타입 정의 ────────────────────────────────────────────────────────
export type PokemonType =
  | "normal"
  | "fighting"
  | "flying"
  | "poison"
  | "ground"
  | "rock"
  | "bug"
  | "ghost"
  | "steel"
  | "fire"
  | "water"
  | "grass"
  | "electric"
  | "psychic"
  | "ice"
  | "dragon"
  | "dark"
  | "fairy";

export type Stage = "base" | "middle" | "final";

export interface Stats {
  hp: number;
  atk: number;
  def: number;
  spa: number;
  spd: number;
  spe: number;
  total: number;
}

// 특성 참조: 슬러그 + 숨김특성 여부. 다국어 이름은 data/abilities.json 에서 조회.
export interface AbilityRef {
  slug: string;
  isHidden: boolean;
}

// 다른 모습(리전폼/고유 폼). 원종과 타입·종족값·특성이 다른 것만 데이터에 있다.
// id 는 원종과 별개인 폼 전용 id(10000번대)로, 스프라이트 파일명에 쓴다.
// 도감번호·진화 계열·이름은 원종(Pokemon)을 그대로 따른다.
export interface PokemonForm {
  id: number;
  slug: string;
  isRegional: boolean; // 알로라/가라르/히스이/팔데아 폼
  formNames: Record<string, string>; // 언어별 폼 라벨 ("알로라의 모습")
  types: PokemonType[];
  stats: Stats;
  abilities: AbilityRef[];
}

export interface Pokemon {
  id: number;
  slug: string;
  names: Record<string, string>;
  types: PokemonType[]; // 길이 1 또는 2
  gen: number;
  chainId: number;
  stage: Stage[];
  isLegendary: boolean;
  isMythical: boolean;
  requiresTrade: boolean;
  stats: Stats;
  abilities: AbilityRef[];
  // 다른 모습 목록 (없으면 빈 배열). 추첨은 원종 단위로만 하므로 필터 조건에는
  // 관여하지 않는다 — 카드에서 폼을 골라 표시만 바꾼다.
  forms: PokemonForm[];
}

export interface FilterOptions {
  gens: Set<number>;
  types: Set<PokemonType>;
  typeMode: "any" | "exact";
  dualOnly: boolean;
  stages: Set<Stage>;
  statTotal?: [number, number]; // 종족값 총합 범위, 없으면 무제한
  excludeLegendary?: boolean; // isLegendary || isMythical 제외
  uniqueChain?: boolean; // 같은 진화 계열 중복 방지 (drawRandom 에서 사용)
}

// ── 단일 포켓몬 판정 (filterPool/countPool 공용) ─────────────────────
// 한 마리가 필터 조건을 통과하는지 검사. 배열을 만들지 않으므로
// countPool 이 결과 배열 없이 그대로 재사용할 수 있다.
function matches(p: Pokemon, opts: FilterOptions): boolean {
  // 세대: 빈 집합이면 아무것도 통과 못 함 → 결과적으로 빈 배열
  if (!opts.gens.has(p.gen)) return false;

  // 타입 매칭
  const S = opts.types;
  if (opts.typeMode === "exact") {
    // 모든 타입이 S 에 속해야 통과 (types ⊆ S).
    // S 가 비어있으면 어떤 포켓몬도 통과 못 한다.
    for (const t of p.types) {
      if (!S.has(t)) return false;
    }
    // 타입 개수는 최소 1 이므로, 위 루프를 통과했다면 교집합도 비어있지 않다.
  } else {
    // any: 타입 중 하나라도 S 에 속하면 통과 (교집합 ≠ ∅).
    let hit = false;
    for (const t of p.types) {
      if (S.has(t)) {
        hit = true;
        break;
      }
    }
    if (!hit) return false;
  }

  // dualOnly: 위 타입 조건에 더해 2타입이어야 통과
  if (opts.dualOnly && p.types.length !== 2) return false;

  // 진화 단계: p.stage 중 하나라도 stages 에 포함되면 통과.
  // (단일 진화 종은 ["base","final"] 이므로 둘 중 하나만 켜도 나온다.)
  let stageHit = false;
  for (const s of p.stage) {
    if (opts.stages.has(s)) {
      stageHit = true;
      break;
    }
  }
  if (!stageHit) return false;

  // 종족값 총합 범위 (있을 때만)
  if (opts.statTotal) {
    const [min, max] = opts.statTotal;
    if (p.stats.total < min || p.stats.total > max) return false;
  }

  // 전설/환상 제외
  if (opts.excludeLegendary && (p.isLegendary || p.isMythical)) return false;

  return true;
}

// ── 1) filterPool ────────────────────────────────────────────────────
// 조건에 맞는 포켓몬 배열을 반환한다.
export function filterPool(all: Pokemon[], opts: FilterOptions): Pokemon[] {
  // gens 또는 types 가 빈 집합이면 결과는 빈 배열 (에러 던지지 않음).
  if (opts.gens.size === 0 || opts.types.size === 0) return [];

  const out: Pokemon[] = [];
  for (const p of all) {
    if (matches(p, opts)) out.push(p);
  }
  return out;
}

// ── 2) drawRandom ────────────────────────────────────────────────────
// pool 에서 중복 없이 count 마리 추출. Fisher-Yates 셔플, 원본 불변.
export function drawRandom(
  pool: Pokemon[],
  count: number,
  opts?: { uniqueChain?: boolean; rng?: () => number }
): Pokemon[] {
  const rng = opts?.rng ?? Math.random;
  const uniqueChain = opts?.uniqueChain ?? false;

  // count 를 1~6 으로 clamp (소수는 내림)
  const want = Math.max(1, Math.min(6, Math.floor(count)));

  // 원본 배열을 건드리지 않도록 복사 후 셔플
  const shuffled = pool.slice();
  // Fisher-Yates: 뒤에서 앞으로 순회하며 임의 위치와 교환
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = shuffled[i];
    shuffled[i] = shuffled[j];
    shuffled[j] = tmp;
  }

  const result: Pokemon[] = [];
  const usedChains = new Set<number>();
  for (const p of shuffled) {
    if (result.length >= want) break;
    // uniqueChain: 이미 뽑힌 것과 같은 진화 계열이면 건너뜀
    if (uniqueChain) {
      if (usedChains.has(p.chainId)) continue;
      usedChains.add(p.chainId);
    }
    result.push(p);
  }
  // uniqueChain 이나 pool 부족으로 count 를 못 채우면 채운 만큼만 반환
  return result;
}

// ── 3) countPool ─────────────────────────────────────────────────────
// filterPool 과 동일 조건으로 "몇 마리인지"만 센다.
// 결과 배열을 만들지 않는 경량 버전 (체크박스 토글마다 호출됨).
export function countPool(all: Pokemon[], opts: FilterOptions): number {
  if (opts.gens.size === 0 || opts.types.size === 0) return 0;

  let n = 0;
  for (const p of all) {
    if (matches(p, opts)) n++;
  }
  return n;
}
