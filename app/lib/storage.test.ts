import { describe, it, expect } from "vitest";
import { parseParty } from "./storage";
import type { PersistedParty } from "./storage";
import { appReducer } from "./appState";
import type { AppState } from "./appState";
import type { FilterOptions, PokemonType, Stage } from "../../src/lib/filter";

// 테스트에서는 1~100 번만 '존재하는 도감 번호'로 취급한다 (JSON import 회피).
const knownId = (id: number) => id >= 1 && id <= 100;

const ivs = { hp: 31, atk: 0, def: 15, spa: 7, spd: 20, spe: 31 };

const validParty: PersistedParty = {
  result: [
    { id: 6, form: null },
    { id: 25, form: 0 },
  ],
  selectedId: 6,
  selectedForm: null,
  roll: { ability: { slug: "blaze", isHidden: false }, natureKey: "adamant", ivs },
};

const parse = (v: unknown) => parseParty(JSON.stringify(v), knownId);

describe("parseParty: 정상 저장본", () => {
  it("파티와 스타팅 롤을 그대로 복원한다", () => {
    expect(parse(validParty)).toEqual(validParty);
  });

  it("스타팅 미선택 상태도 복원한다", () => {
    const onlyParty: PersistedParty = {
      result: [{ id: 1, form: null }],
      selectedId: null,
      selectedForm: null,
      roll: null,
    };
    expect(parse(onlyParty)).toEqual(onlyParty);
  });

  it("빈 파티도 유효한 저장본이다", () => {
    const empty: PersistedParty = {
      result: [],
      selectedId: null,
      selectedForm: null,
      roll: null,
    };
    expect(parse(empty)).toEqual(empty);
  });
});

describe("parseParty: 깨진 저장본은 통째로 버린다", () => {
  it.each([
    ["저장본 없음", null],
    ["JSON 아님", "{not json"],
    ["빈 문자열", ""],
  ])("%s → null", (_label, raw) => {
    expect(parseParty(raw as string | null, knownId)).toBeNull();
  });

  it.each<[string, unknown]>([
    ["최상위가 배열", []],
    ["result 가 배열이 아님", { ...validParty, result: {} }],
    ["파티가 6장 초과", {
      ...validParty,
      result: Array.from({ length: 7 }, (_, i) => ({ id: i + 1, form: null })),
    }],
    ["슬롯에 id 없음", { ...validParty, result: [{ form: null }] }],
    ["id 가 문자열", { ...validParty, result: [{ id: "6", form: null }] }],
    ["모르는 도감 번호", { ...validParty, result: [{ id: 9999, form: null }] }],
    ["form 이 음수", { ...validParty, result: [{ id: 6, form: -1 }] }],
    ["selectedId 가 모르는 번호", { ...validParty, selectedId: 9999 }],
    ["natureKey 없음", {
      ...validParty,
      roll: { ability: null, ivs },
    }],
    ["IV 가 31 초과", {
      ...validParty,
      roll: { ability: null, natureKey: "hardy", ivs: { ...ivs, hp: 32 } },
    }],
    ["IV 스탯 하나 누락", {
      ...validParty,
      roll: {
        ability: null,
        natureKey: "hardy",
        ivs: { hp: 1, atk: 1, def: 1, spa: 1, spd: 1 },
      },
    }],
    ["ability 형식 오류", {
      ...validParty,
      roll: { ability: { slug: "blaze" }, natureKey: "hardy", ivs },
    }],
    ["스타팅 미선택인데 롤이 있음", { ...validParty, selectedId: null, selectedForm: null }],
  ])("%s → null", (_label, raw) => {
    expect(parse(raw)).toBeNull();
  });
});

// ── hydrate 액션: 저장본 복원이 조건/표시 옵션을 건드리지 않는지 ──────
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
    result: [],
    requested: 0,
    selectedId: null,
    selectedForm: null,
    roll: null,
    ...over,
  };
}

describe("appReducer: hydrate", () => {
  it("저장본의 파티와 스타팅을 상태에 싣는다", () => {
    const next = appReducer(mkState(), { type: "hydrate", ...validParty });
    expect(next.result).toEqual(validParty.result);
    expect(next.selectedId).toBe(6);
    expect(next.roll).toEqual(validParty.roll);
  });

  it("조건과 표시 옵션은 그대로 둔다", () => {
    const state = mkState();
    const next = appReducer(state, { type: "hydrate", ...validParty });
    expect(next.filters).toBe(state.filters);
    expect(next.display).toBe(state.display);
  });

  it("파티는 최대 6장까지만 싣는다", () => {
    const next = appReducer(mkState(), {
      type: "hydrate",
      result: Array.from({ length: 8 }, (_, i) => ({ id: i + 1, form: null })),
      selectedId: null,
      selectedForm: null,
      roll: null,
    });
    expect(next.result).toHaveLength(6);
  });
});
