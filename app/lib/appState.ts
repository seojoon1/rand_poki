// 앱 상태 리듀서 (순수 함수).
// ★ 핵심: 뽑기 조건(filters)/표시 옵션(display) 변경은 결과(result)를 절대
//   건드리지 않는다. 오직 'draw' 액션만 result 를 바꾼다.
//   이 불변식을 appState.test.ts 에서 검증한다.

import type { FilterOptions } from "../../src/lib/filter";
import type { AbilityRef } from "../../src/lib/filter";
import type { StarterRoll, IVs } from "../../src/lib/starter";
import { emptyRoll } from "../../src/lib/starter";
import type { LangCode } from "./pokedex";

// 표시 옵션 — 바뀌면 즉시 반영, 재추첨 없음
export interface DisplayOptions {
  lang: LangCode;
  showImage: boolean;
  showNumber: boolean;
  showTypes: boolean;
  showStats: boolean;
}

// 파티 한 칸. 추첨은 원종 단위이고, 리전폼/고유 폼은 뽑은 뒤 칸마다 고른다.
// form 은 Pokemon.forms 의 인덱스이고 null 이면 원종 모습이다.
export interface PartySlot {
  id: number;
  form: number | null;
}

export interface AppState {
  filters: FilterOptions; // A. 뽑기 조건 (버튼 눌러야 재추첨)
  display: DisplayOptions; // B. 표시 옵션 (즉시 반영)
  result: PartySlot[]; // C. 결과는 id(+폼 인덱스)만 저장 (객체 복사 금지)
  requested: number; // 마지막 뽑기에서 요청한(clamp된) 마리 수 — 부족분 안내용
  selectedId: number | null; // D. 스타팅 탭으로 넘긴 포켓몬 id
  selectedForm: number | null; // D. 스타팅으로 넘긴 폼 인덱스 (원종이면 null)
  roll: StarterRoll | null; // D. 현재 롤 결과(특성/성격/개체값)
}

export type AppAction =
  // 조건 변경: result 유지
  | { type: "setFilters"; filters: FilterOptions }
  // 표시 옵션 변경: result 유지
  | { type: "patchDisplay"; patch: Partial<DisplayOptions> }
  // 뽑기: 한 번에 여러 장. 컴포넌트에서 filter.ts(filterPool/drawRandom)로 계산한 id 배열을 받음
  | { type: "draw"; ids: number[]; requested: number }
  // 추가: 카드 한 장을 파티 끝에 덧붙임 (최대 6장)
  | { type: "addOne"; id: number }
  // 삭제: result 의 index 슬롯 하나만 파티에서 제거
  | { type: "removeOne"; index: number }
  // 초기화: 파티 비우기
  | { type: "reset" }
  // 개별 리롤: result 의 index 슬롯 하나만 새 id 로 교체
  | { type: "rerollOne"; index: number; id: number }
  // 모습 변경: index 슬롯의 폼만 교체 (null = 원종). 포켓몬 자체는 그대로.
  | { type: "setForm"; index: number; form: number | null }
  // 스타팅 선택: 포켓몬(+선택된 모습)을 스타팅 탭으로 넘김 (기본 롤로 초기화)
  | { type: "selectStarter"; id: number; form: number | null }
  // 스타팅 롤: 특성/성격/개체값 결과 저장 (컴포넌트에서 starter.ts 로 계산)
  | { type: "rollStarter"; roll: StarterRoll }
  // 개체값 개별 롤/입력: 스탯 하나만 새 값으로 교체
  | { type: "rerollIv"; stat: keyof IVs; value: number }
  // 성격 지정(드롭다운/돌리기 공용)
  | { type: "setNature"; natureKey: string }
  // 특성 지정(돌리기)
  | { type: "setAbility"; ability: AbilityRef | null }
  // 복원: localStorage 에 저장돼 있던 파티/스타팅을 되살림 (마운트 직후 1회)
  | {
      type: "hydrate";
      result: PartySlot[];
      selectedId: number | null;
      selectedForm: number | null;
      roll: StarterRoll | null;
    };

// 파티 최대 인원
export const MAX_PARTY = 6;

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "setFilters":
      // 조건이 바뀌어도 이미 뽑힌 결과는 그대로 둔다.
      return { ...state, filters: action.filters };
    case "patchDisplay":
      // 표시 옵션 변경은 결과에 영향 없음.
      return {
        ...state,
        display: { ...state.display, ...action.patch },
      };
    case "draw":
      // 여러 장 한 번에: result 전체 교체. 새로 뽑은 칸은 원종 모습으로 시작.
      return {
        ...state,
        result: action.ids.map((id) => ({ id, form: null })),
        requested: action.requested,
      };
    case "addOne":
      // 최대 6장까지만 덧붙인다.
      if (state.result.length >= MAX_PARTY) return state;
      return {
        ...state,
        result: [...state.result, { id: action.id, form: null }],
      };
    case "removeOne": {
      // 해당 슬롯만 파티에서 빼고 나머지는 순서 유지.
      if (action.index < 0 || action.index >= state.result.length) return state;
      const next = state.result.filter((_, i) => i !== action.index);
      return { ...state, result: next };
    }
    case "reset":
      // 파티 비우기.
      return { ...state, result: [], requested: 0 };
    case "rerollOne": {
      // 해당 슬롯만 새 id 로 교체 (나머지 카드는 유지).
      // 다른 포켓몬이 되므로 폼 선택은 원종으로 되돌린다.
      if (action.index < 0 || action.index >= state.result.length) return state;
      const next = state.result.slice();
      next[action.index] = { id: action.id, form: null };
      return { ...state, result: next };
    }
    case "setForm": {
      // 모습만 교체 — 어떤 포켓몬이 뽑혔는지는 건드리지 않는다.
      if (action.index < 0 || action.index >= state.result.length) return state;
      const next = state.result.slice();
      next[action.index] = { ...next[action.index], form: action.form };
      return { ...state, result: next };
    }
    case "selectStarter":
      // 새 스타팅 포켓몬 선택 → 기본 롤(개체값 0/중립 성격/특성 없음)로 초기화.
      return {
        ...state,
        selectedId: action.id,
        selectedForm: action.form,
        roll: emptyRoll(),
      };
    case "rollStarter":
      return { ...state, roll: action.roll };
    case "rerollIv":
      // 롤 결과가 있을 때만 해당 스탯 하나 교체.
      if (!state.roll) return state;
      return {
        ...state,
        roll: {
          ...state.roll,
          ivs: { ...state.roll.ivs, [action.stat]: action.value },
        },
      };
    case "setNature":
      if (!state.roll) return state;
      return { ...state, roll: { ...state.roll, natureKey: action.natureKey } };
    case "setAbility":
      if (!state.roll) return state;
      return { ...state, roll: { ...state.roll, ability: action.ability } };
    case "hydrate":
      // 저장본 복원. 조건(filters)/표시 옵션(display)은 건드리지 않는다 —
      // filters 는 URL 이, display 는 초기값이 각각 진실의 원천이다.
      return {
        ...state,
        result: action.result.slice(0, MAX_PARTY),
        requested: 0,
        selectedId: action.selectedId,
        selectedForm: action.selectedForm,
        roll: action.roll,
      };
    default:
      return state;
  }
}
