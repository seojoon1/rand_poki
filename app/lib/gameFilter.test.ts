// 실제 도감 데이터(data/pokemon.json)로 게임 필터를 검증한다.
// filter.test.ts 는 가짜 포켓몬으로 로직만 보고, 여기서는 수집된 데이터가
// 실제 게임과 맞는지(칸토 151마리 등)를 확인한다.
import { describe, it, expect } from "vitest";
import { countPool } from "../../src/lib/filter";
import { ALL_POKEMON, VERSION_GROUPS, gamesToMask, BY_ID } from "./pokedex";
import { defaultFilters } from "./urlFilters";

const countFor = (...games: string[]) =>
  countPool(ALL_POKEMON, {
    ...defaultFilters(),
    gameMask: gamesToMask(games),
  });

describe("게임별 입수 가능 종 수", () => {
  // 각 게임의 실제 지역도감 등재 수
  it.each([
    ["red-blue", 151], // 칸토도감
    ["yellow", 151],
    ["gold-silver", 251], // 조토도감
    ["firered-leafgreen", 151],
    ["diamond-pearl", 151], // 신오도감(원본)
    ["platinum", 210], // 신오도감(확장)
    ["brilliant-diamond-shining-pearl", 151],
    ["x-y", 454], // 센트럴+코스트+마운틴
    ["legends-arceus", 242], // 히스이도감
  ])("%s → %i마리", (game, expected) => {
    expect(countFor(game)).toBe(expected);
  });

  it("여러 게임은 합집합 — 각각보다 크거나 같다", () => {
    const rb = countFor("red-blue");
    const rs = countFor("ruby-sapphire");
    const both = countFor("red-blue", "ruby-sapphire");
    expect(both).toBeGreaterThan(Math.max(rb, rs));
    expect(both).toBeLessThanOrEqual(rb + rs);
  });

  it("게임 조건이 없으면 전체 1025마리", () => {
    expect(countPool(ALL_POKEMON, defaultFilters())).toBe(1025);
  });
});

describe("개별 포켓몬 입수 판정", () => {
  const canGet = (id: number, game: string) =>
    (BY_ID.get(id)!.vg & gamesToMask([game])) !== 0;

  it("스타팅·진화도 잡힌다 (야생 조우 데이터만으로는 누락되는 것들)", () => {
    expect(canGet(1, "red-blue")).toBe(true); // 이상해씨 — 스타팅
    expect(canGet(6, "red-blue")).toBe(true); // 리자몽 — 진화로만
    expect(canGet(150, "red-blue")).toBe(true); // 뮤츠 — 고정 심볼
  });

  it("해당 게임에 없는 종은 걸러진다", () => {
    expect(canGet(251, "red-blue")).toBe(false); // 세레비(2세대)
    expect(canGet(1, "ruby-sapphire")).toBe(false); // 이상해씨는 호연도감에 없다
    expect(canGet(906, "sword-shield")).toBe(false); // 나오하(9세대)
  });
});

describe("데이터 스키마", () => {
  it("모든 종이 vg 를 가진다", () => {
    for (const p of ALL_POKEMON) {
      expect(typeof p.vg).toBe("number");
    }
  });

  it("어느 게임에도 등장하지 않는 종은 없다", () => {
    expect(ALL_POKEMON.filter((p) => p.vg === 0)).toHaveLength(0);
  });

  it("정의된 게임 비트 밖의 값은 켜져 있지 않다", () => {
    const all = gamesToMask(VERSION_GROUPS.map((vg) => vg.key));
    for (const p of ALL_POKEMON) {
      expect(p.vg & ~all).toBe(0);
    }
  });
});
