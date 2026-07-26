// 스타팅 포켓몬 개체 롤: 특성 / 성격 / 개체값(IV 0~31).
// 순수 함수 모듈. rng 주입 가능(기본 Math.random)해 테스트에서 시드 고정.

import type { AbilityRef, Pokemon, Stats } from "./filter";

// 성격이 보정하는 스탯 키 (HP 는 성격 영향 없음)
export type NatureStat = "atk" | "def" | "spa" | "spd" | "spe";

export interface NatureDef {
  key: string;
  ko: string;
  en: string;
  up: NatureStat | null; // +10% 스탯 (중립이면 null)
  down: NatureStat | null; // -10% 스탯 (중립이면 null)
}

// 25종 성격. up===null 이면 보정 없는 중립 성격(5종).
export const NATURES: NatureDef[] = [
  { key: "hardy", ko: "노력", en: "Hardy", up: null, down: null },
  { key: "lonely", ko: "외로움", en: "Lonely", up: "atk", down: "def" },
  { key: "brave", ko: "용감", en: "Brave", up: "atk", down: "spe" },
  { key: "adamant", ko: "고집", en: "Adamant", up: "atk", down: "spa" },
  { key: "naughty", ko: "개구쟁이", en: "Naughty", up: "atk", down: "spd" },
  { key: "bold", ko: "대담", en: "Bold", up: "def", down: "atk" },
  { key: "docile", ko: "온순", en: "Docile", up: null, down: null },
  { key: "relaxed", ko: "무사태평", en: "Relaxed", up: "def", down: "spe" },
  { key: "impish", ko: "장난꾸러기", en: "Impish", up: "def", down: "spa" },
  { key: "lax", ko: "촐랑", en: "Lax", up: "def", down: "spd" },
  { key: "timid", ko: "겁쟁이", en: "Timid", up: "spe", down: "atk" },
  { key: "hasty", ko: "성급", en: "Hasty", up: "spe", down: "def" },
  { key: "serious", ko: "성실", en: "Serious", up: null, down: null },
  { key: "jolly", ko: "명랑", en: "Jolly", up: "spe", down: "spa" },
  { key: "naive", ko: "천진난만", en: "Naive", up: "spe", down: "spd" },
  { key: "modest", ko: "조심", en: "Modest", up: "spa", down: "atk" },
  { key: "mild", ko: "의젓", en: "Mild", up: "spa", down: "def" },
  { key: "quiet", ko: "냉정", en: "Quiet", up: "spa", down: "spe" },
  { key: "bashful", ko: "수줍음", en: "Bashful", up: null, down: null },
  { key: "rash", ko: "덜렁", en: "Rash", up: "spa", down: "spd" },
  { key: "calm", ko: "차분", en: "Calm", up: "spd", down: "atk" },
  { key: "gentle", ko: "얌전", en: "Gentle", up: "spd", down: "def" },
  { key: "sassy", ko: "건방", en: "Sassy", up: "spd", down: "spe" },
  { key: "careful", ko: "신중", en: "Careful", up: "spd", down: "spa" },
  { key: "quirky", ko: "변덕", en: "Quirky", up: null, down: null },
];

const NATURE_BY_KEY = new Map(NATURES.map((n) => [n.key, n]));
export function getNature(key: string): NatureDef | undefined {
  return NATURE_BY_KEY.get(key);
}

// 개체값(IV): 6스탯 각 0~31
export interface IVs {
  hp: number;
  atk: number;
  def: number;
  spa: number;
  spd: number;
  spe: number;
}

// 롤 결과: 특성 / 성격키 / 개체값
export interface StarterRoll {
  ability: AbilityRef | null;
  natureKey: string;
  ivs: IVs;
}

// 0~31 정수 하나
export function rollIV(rng: () => number = Math.random): number {
  return Math.floor(rng() * 32);
}

// 6스탯 개체값
export function rollIVs(rng: () => number = Math.random): IVs {
  return {
    hp: rollIV(rng),
    atk: rollIV(rng),
    def: rollIV(rng),
    spa: rollIV(rng),
    spd: rollIV(rng),
    spe: rollIV(rng),
  };
}

// 성격 하나 (균등)
export function rollNature(rng: () => number = Math.random): NatureDef {
  return NATURES[Math.floor(rng() * NATURES.length)];
}

// 특성 하나 (해당 포켓몬의 특성 목록에서 균등, 숨김특성 포함).
// 목록이 비어있으면 null.
export function rollAbility(
  abilities: AbilityRef[],
  rng: () => number = Math.random
): AbilityRef | null {
  if (!abilities || abilities.length === 0) return null;
  return abilities[Math.floor(rng() * abilities.length)];
}

// 특성 + 성격 + 개체값을 한 번에 롤
export function rollStarter(
  pokemon: Pick<Pokemon, "abilities">,
  rng: () => number = Math.random
): StarterRoll {
  return {
    ability: rollAbility(pokemon.abilities, rng),
    natureKey: rollNature(rng).key,
    ivs: rollIVs(rng),
  };
}

// 중립 성격 키 (보정 없음)
export const NEUTRAL_NATURE = "hardy";

// 스타팅 선택 직후의 기본 상태: 특성 없음 / 중립 성격 / 개체값 전부 0.
// 이후 각 항목을 개별 '돌리기' 로 채운다.
export function emptyRoll(): StarterRoll {
  return {
    ability: null,
    natureKey: NEUTRAL_NATURE,
    ivs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
  };
}

// ── 실능력치 계산 (레벨 50, 노력치 0) ───────────────────────────────
// HP    = floor((2*종족값 + IV) * L/100) + L + 10
// 그 외 = floor( (floor((2*종족값 + IV) * L/100) + 5) * 성격보정 )
//   성격보정: 상승 스탯 ×1.1, 하락 스탯 ×0.9, 그 외 ×1.0
export const DEFAULT_LEVEL = 50;

export interface FinalStat {
  total: number; // 최종 실능력치
  basePart: number; // IV 0 일 때의 값 (막대의 '기본' 부분)
  bonus: number; // IV 로 늘어난 양 (막대의 '보너스' 부분)
}
export type FinalStats = Record<keyof IVs, FinalStat>;

function natureMult(nature: NatureDef | undefined, stat: NatureStat): number {
  if (!nature) return 1;
  if (nature.up === stat) return 1.1;
  if (nature.down === stat) return 0.9;
  return 1;
}

function statValue(
  base: number,
  iv: number,
  level: number,
  isHP: boolean,
  mult: number
): number {
  const core = Math.floor(((2 * base + iv) * level) / 100);
  if (isHP) return core + level + 10;
  return Math.floor((core + 5) * mult);
}

export function finalStats(
  base: Stats,
  ivs: IVs,
  natureKey: string,
  level: number = DEFAULT_LEVEL
): FinalStats {
  const nature = getNature(natureKey);
  const mk = (
    statKey: keyof IVs,
    baseVal: number,
    iv: number
  ): FinalStat => {
    const isHP = statKey === "hp";
    const mult = isHP ? 1 : natureMult(nature, statKey as NatureStat);
    const total = statValue(baseVal, iv, level, isHP, mult);
    const basePart = statValue(baseVal, 0, level, isHP, mult);
    return { total, basePart, bonus: total - basePart };
  };
  return {
    hp: mk("hp", base.hp, ivs.hp),
    atk: mk("atk", base.atk, ivs.atk),
    def: mk("def", base.def, ivs.def),
    spa: mk("spa", base.spa, ivs.spa),
    spd: mk("spd", base.spd, ivs.spd),
    spe: mk("spe", base.spe, ivs.spe),
  };
}
