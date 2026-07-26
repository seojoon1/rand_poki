// 포켓몬 데이터 로딩 + UI 메타데이터 (타입 색상/이름, 스탯/언어 라벨).
// data/pokemon.json 을 빌드 타임에 import 한다 (런타임 fetch 금지).

import rawData from "../../data/pokemon.json";
import rawAbilities from "../../data/abilities.json";
import type { Pokemon, PokemonType, Stage } from "../../src/lib/filter";

// JSON 은 types 가 string[] 로 추론되므로 Pokemon[] 로 단언한다.
// (fetch-pokemon.mjs 가 스키마를 보장한다.)
const data = rawData as unknown as { pokemon: Pokemon[] };

// 전체 포켓몬 배열 (불변으로 취급)
export const ALL_POKEMON: Pokemon[] = data.pokemon;

// id → Pokemon 조회 맵. 결과는 id 만 저장하고 렌더 시점에 여기서 조회한다.
export const BY_ID: Map<number, Pokemon> = new Map(
  ALL_POKEMON.map((p) => [p.id, p])
);

// 세대/타입/단계 상수
export const ALL_GENS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;
export const ALL_TYPES: PokemonType[] = [
  "normal", "fighting", "flying", "poison", "ground", "rock", "bug", "ghost",
  "steel", "fire", "water", "grass", "electric", "psychic", "ice", "dragon",
  "dark", "fairy",
];
export const ALL_STAGES: Stage[] = ["base", "middle", "final"];

// 종족값 총합 범위 (슬라이더 경계)
export const STAT_TOTAL_MIN = 175;
export const STAT_TOTAL_MAX = 720;

// ── 스탯 행 메타 (표시 순서 + 한국어 라벨) ──────────────────────────
export const STAT_ROWS = [
  { key: "hp", label: "HP" },
  { key: "atk", label: "공격" },
  { key: "def", label: "방어" },
  { key: "spa", label: "특공" },
  { key: "spd", label: "특방" },
  { key: "spe", label: "스피드" },
] as const;

// ── 언어 옵션 ────────────────────────────────────────────────────────
export type LangCode = "ko" | "en" | "ja" | "de" | "fr" | "es" | "it" | "zh";
export const LANGS: { code: LangCode; label: string }[] = [
  { code: "ko", label: "한국어" },
  { code: "en", label: "English" },
  { code: "ja", label: "日本語" },
  { code: "de", label: "Deutsch" },
  { code: "fr", label: "Français" },
  { code: "es", label: "Español" },
  { code: "it", label: "Italiano" },
  { code: "zh", label: "中文" },
];

// 이름 조회: 해당 언어가 없으면 en, 그것도 없으면 slug 폴백
export function nameOf(p: Pokemon, lang: LangCode): string {
  return p.names[lang] ?? p.names.en ?? p.slug;
}

// ── 진화 단계 라벨 (한국어) ──────────────────────────────────────────
export const STAGE_LABEL: Record<Stage, string> = {
  base: "기본",
  middle: "중간",
  final: "최종",
};

// ── 타입 뱃지 색상 (Tailwind 클래스) ────────────────────────────────
// 밝은 타입은 어두운 글자, 어두운 타입은 흰 글자.
export const TYPE_COLOR: Record<PokemonType, string> = {
  normal: "bg-stone-400 text-black",
  fighting: "bg-red-700 text-white",
  flying: "bg-indigo-300 text-black",
  poison: "bg-purple-600 text-white",
  ground: "bg-amber-600 text-white",
  rock: "bg-yellow-700 text-white",
  bug: "bg-lime-500 text-black",
  ghost: "bg-violet-700 text-white",
  steel: "bg-slate-400 text-black",
  fire: "bg-orange-500 text-white",
  water: "bg-blue-500 text-white",
  grass: "bg-green-500 text-white",
  electric: "bg-yellow-400 text-black",
  psychic: "bg-pink-500 text-white",
  ice: "bg-cyan-300 text-black",
  dragon: "bg-indigo-600 text-white",
  dark: "bg-neutral-700 text-white",
  fairy: "bg-pink-300 text-black",
};

// ── 타입 이름 (ko/ja/en 제공, 그 외 언어는 en 폴백) ─────────────────
const TYPE_NAME: Partial<Record<LangCode, Record<PokemonType, string>>> = {
  ko: {
    normal: "노말", fighting: "격투", flying: "비행", poison: "독", ground: "땅",
    rock: "바위", bug: "벌레", ghost: "고스트", steel: "강철", fire: "불꽃",
    water: "물", grass: "풀", electric: "전기", psychic: "에스퍼", ice: "얼음",
    dragon: "드래곤", dark: "악", fairy: "페어리",
  },
  ja: {
    normal: "ノーマル", fighting: "かくとう", flying: "ひこう", poison: "どく", ground: "じめん",
    rock: "いわ", bug: "むし", ghost: "ゴースト", steel: "はがね", fire: "ほのお",
    water: "みず", grass: "くさ", electric: "でんき", psychic: "エスパー", ice: "こおり",
    dragon: "ドラゴン", dark: "あく", fairy: "フェアリー",
  },
};

// 영어는 첫 글자만 대문자 (별도 테이블 없이 생성)
function enTypeName(t: PokemonType): string {
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export function typeName(t: PokemonType, lang: LangCode): string {
  return TYPE_NAME[lang]?.[t] ?? enTypeName(t);
}

// ── 특성 이름 (data/abilities.json: slug → 언어별 이름) ─────────────
const ABILITY_NAMES = rawAbilities as Record<
  string,
  Record<LangCode, string> | null
>;
export function abilityName(slug: string, lang: LangCode): string {
  const n = ABILITY_NAMES[slug];
  if (!n) return slug; // 이름 데이터 없으면 슬러그 폴백
  return n[lang] ?? n.en ?? slug;
}
