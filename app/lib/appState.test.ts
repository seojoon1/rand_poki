import { describe, it, expect } from "vitest";
import { appReducer } from "./appState";
import type { AppState } from "./appState";
import type { FilterOptions, PokemonType, Stage } from "../../src/lib/filter";

// 테스트용 최소 필터 (pokedex/JSON import 없이 구성)
function mkFilters(over: Partial<FilterOptions> = {}): FilterOptions {
  return {
    gens: new Set([1]),
    types: new Set<PokemonType>(["fire"]),
    typeMode: "any",
    dualOnly: false,
    stages: new Set<Stage>(["base", "middle", "final"]),
    ...over,
  };
}

function mkState(over: Partial<AppState> = {}): AppState {
  return {
    filters: mkFilters(),
    display: {
      lang: "ko",
      showImage: true,
      showNumber: true,
      showTypes: true,
      showStats: true,
    },
    result: [1, 2, 3],
    requested: 3,
    selectedId: null,
    roll: null,
    ...over,
  };
}

describe("appReducer: 상태 분리 불변식", () => {
  it("setFilters 는 result 를 초기화하지 않는다 (부작용 금지)", () => {
    const before = mkState();
    const after = appReducer(before, {
      type: "setFilters",
      filters: mkFilters({ gens: new Set([2, 3]) }),
    });
    // 조건은 바뀌었지만 결과는 그대로여야 한다
    expect(after.result).toBe(before.result);
    expect(after.result).toEqual([1, 2, 3]);
    expect([...after.filters.gens]).toEqual([2, 3]);
  });

  it("patchDisplay 는 result 를 초기화하지 않는다 (언어 전환=재추첨 없음)", () => {
    const before = mkState();
    const after = appReducer(before, {
      type: "patchDisplay",
      patch: { lang: "en" },
    });
    expect(after.result).toBe(before.result);
    expect(after.display.lang).toBe("en");
    // 다른 표시 옵션은 유지
    expect(after.display.showStats).toBe(true);
  });

  it("draw 만이 result 를 갱신한다", () => {
    const before = mkState({ result: [], requested: 0 });
    const after = appReducer(before, {
      type: "draw",
      ids: [6, 9, 25],
      requested: 3,
    });
    expect(after.result).toEqual([6, 9, 25]);
    expect(after.requested).toBe(3);
    // 필터/표시는 그대로
    expect(after.filters).toBe(before.filters);
    expect(after.display).toBe(before.display);
  });

  it("addOne 은 파티 끝에 덧붙인다", () => {
    const before = mkState({ result: [1, 2], requested: 2 });
    const after = appReducer(before, { type: "addOne", id: 3 });
    expect(after.result).toEqual([1, 2, 3]);
  });

  it("addOne 은 6장을 넘기지 않는다", () => {
    const before = mkState({ result: [1, 2, 3, 4, 5, 6], requested: 6 });
    const after = appReducer(before, { type: "addOne", id: 7 });
    expect(after).toBe(before); // 변화 없음
    expect(after.result).toHaveLength(6);
  });

  it("reset 은 파티를 비운다", () => {
    const before = mkState({ result: [1, 2, 3], requested: 3 });
    const after = appReducer(before, { type: "reset" });
    expect(after.result).toEqual([]);
    expect(after.requested).toBe(0);
    // 필터/표시는 유지
    expect(after.filters).toBe(before.filters);
  });

  it("rerollOne 은 해당 슬롯만 교체하고 나머지는 유지", () => {
    const before = mkState({ result: [1, 2, 3], requested: 3 });
    const after = appReducer(before, { type: "rerollOne", index: 1, id: 99 });
    expect(after.result).toEqual([1, 99, 3]);
    expect(after.requested).toBe(3); // 요청 수는 그대로
  });

  it("rerollOne 의 index 가 범위를 벗어나면 상태 불변", () => {
    const before = mkState({ result: [1, 2], requested: 2 });
    expect(appReducer(before, { type: "rerollOne", index: 5, id: 99 })).toBe(before);
    expect(appReducer(before, { type: "rerollOne", index: -1, id: 99 })).toBe(before);
  });

  it("removeOne 은 해당 슬롯만 빼고 순서를 유지한다", () => {
    const before = mkState({ result: [1, 2, 3], requested: 3 });
    const after = appReducer(before, { type: "removeOne", index: 1 });
    expect(after.result).toEqual([1, 3]);
    expect(after.requested).toBe(3); // 요청 수는 그대로
  });

  it("removeOne 의 index 가 범위를 벗어나면 상태 불변", () => {
    const before = mkState({ result: [1, 2], requested: 2 });
    expect(appReducer(before, { type: "removeOne", index: 5 })).toBe(before);
    expect(appReducer(before, { type: "removeOne", index: -1 })).toBe(before);
  });

  it("selectStarter 는 선택 id 를 세우고 기본 롤로 초기화", () => {
    const before = mkState({
      selectedId: 1,
      roll: {
        ability: { slug: "blaze", isHidden: false },
        natureKey: "adamant",
        ivs: { hp: 1, atk: 2, def: 3, spa: 4, spd: 5, spe: 6 },
      },
    });
    const after = appReducer(before, { type: "selectStarter", id: 6 });
    expect(after.selectedId).toBe(6);
    // 기본 롤: 개체값 전부 0, 중립 성격, 특성 없음
    expect(after.roll?.ivs).toEqual({ hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 });
    expect(after.roll?.natureKey).toBe("hardy");
    expect(after.roll?.ability).toBeNull();
    // 뽑기 결과는 그대로
    expect(after.result).toEqual(before.result);
  });

  it("rerollIv/setNature/setAbility 는 롤의 해당 부분만 교체", () => {
    const base = {
      ability: null,
      natureKey: "hardy",
      ivs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
    };
    let s = mkState({ selectedId: 6, roll: base });
    s = appReducer(s, { type: "rerollIv", stat: "atk", value: 31 });
    expect(s.roll?.ivs.atk).toBe(31);
    expect(s.roll?.ivs.hp).toBe(0); // 나머지 유지
    s = appReducer(s, { type: "setNature", natureKey: "adamant" });
    expect(s.roll?.natureKey).toBe("adamant");
    s = appReducer(s, {
      type: "setAbility",
      ability: { slug: "blaze", isHidden: false },
    });
    expect(s.roll?.ability?.slug).toBe("blaze");
    expect(s.roll?.ivs.atk).toBe(31); // 앞서 롤한 값 유지
  });

  it("roll 이 없으면 rerollIv/setNature/setAbility 는 무시", () => {
    const before = mkState({ selectedId: null, roll: null });
    expect(appReducer(before, { type: "rerollIv", stat: "hp", value: 5 })).toBe(before);
    expect(appReducer(before, { type: "setNature", natureKey: "bold" })).toBe(before);
    expect(appReducer(before, { type: "setAbility", ability: null })).toBe(before);
  });

  it("rollStarter 는 롤 결과만 저장 (선택 id 유지)", () => {
    const before = mkState({ selectedId: 6, roll: null });
    const roll = {
      ability: { slug: "solar-power", isHidden: true },
      natureKey: "modest",
      ivs: { hp: 31, atk: 0, def: 15, spa: 31, spd: 20, spe: 10 },
    };
    const after = appReducer(before, { type: "rollStarter", roll });
    expect(after.roll).toEqual(roll);
    expect(after.selectedId).toBe(6);
  });

  it("연속 필터 변경 후에도 마지막 draw 결과가 유지된다", () => {
    let s = mkState({ result: [], requested: 0 });
    s = appReducer(s, { type: "draw", ids: [10, 20], requested: 2 });
    s = appReducer(s, { type: "setFilters", filters: mkFilters({ gens: new Set([5]) }) });
    s = appReducer(s, { type: "patchDisplay", patch: { showTypes: false } });
    expect(s.result).toEqual([10, 20]);
  });
});
