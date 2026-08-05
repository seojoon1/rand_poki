import { describe, it, expect } from "vitest";
import { defaultFilters, filtersToSearch, searchToFilters } from "./urlFilters";
import { ALL_GAMES_MASK, VERSION_GROUPS, gamesToMask } from "./pokedex";

// 데이터에 실제로 있는 게임 키 두 개 (하드코딩 대신 목록에서 가져온다)
const [g0, g1] = VERSION_GROUPS.map((vg) => vg.key);

describe("게임 조건 URL 직렬화", () => {
  it("기본값(조건 없음)이면 vg 파라미터가 붙지 않는다", () => {
    expect(filtersToSearch(defaultFilters())).not.toContain("vg=");
  });

  it("전체 선택도 조건 없음과 같게 취급해 생략한다", () => {
    const f = { ...defaultFilters(), gameMask: ALL_GAMES_MASK };
    expect(filtersToSearch(f)).not.toContain("vg=");
  });

  it("고른 게임을 키로 직렬화한다 (마스크 숫자가 아니라)", () => {
    const f = { ...defaultFilters(), gameMask: gamesToMask([g0, g1]) };
    const search = filtersToSearch(f);
    expect(decodeURIComponent(search)).toContain(`vg=${g0}.${g1}`);
  });

  it("왕복해도 같은 마스크가 나온다", () => {
    const mask = gamesToMask([g0, g1]);
    const back = searchToFilters(filtersToSearch({ ...defaultFilters(), gameMask: mask }));
    expect(back.gameMask).toBe(mask);
  });

  it("vg 가 없으면 undefined (조건 없음)", () => {
    expect(searchToFilters("?g=1.2").gameMask).toBeUndefined();
  });

  it("모르는 게임 키는 무시한다", () => {
    expect(searchToFilters(`?vg=${g0}.존재하지않는게임`).gameMask).toBe(
      gamesToMask([g0])
    );
  });

  it("전체 해제 상태(vg 빈 값)는 0 으로 복원된다", () => {
    // 0 = 아무 게임도 안 고름 → 결과 없음. 사용자가 만든 상태 그대로 살린다.
    expect(searchToFilters("?vg=").gameMask).toBe(0);
  });
});

describe("기존 조건 직렬화 회귀", () => {
  it("게임 조건이 추가돼도 다른 항목 왕복이 깨지지 않는다", () => {
    const f = {
      ...defaultFilters(),
      gens: new Set([1, 4]),
      typeMode: "exact" as const,
      dualOnly: true,
      excludeLegendary: true,
      uniqueChain: true,
      statTotal: [300, 500] as [number, number],
      gameMask: gamesToMask([g1]),
    };
    const back = searchToFilters(filtersToSearch(f));
    expect([...back.gens].sort()).toEqual([1, 4]);
    expect(back.typeMode).toBe("exact");
    expect(back.dualOnly).toBe(true);
    expect(back.excludeLegendary).toBe(true);
    expect(back.uniqueChain).toBe(true);
    expect(back.statTotal).toEqual([300, 500]);
    expect(back.gameMask).toBe(gamesToMask([g1]));
  });
});

describe("데이터 정합성", () => {
  it("버전 그룹이 31개를 넘지 않는다 (32비트 마스크 한계)", () => {
    expect(VERSION_GROUPS.length).toBeLessThanOrEqual(31);
    expect(VERSION_GROUPS.length).toBeGreaterThan(0);
  });

  it("게임 키가 중복되지 않는다", () => {
    const keys = VERSION_GROUPS.map((vg) => vg.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
