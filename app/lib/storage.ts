// 뽑은 포켓몬(파티 + 스타팅 선택)을 localStorage 에 저장/복원한다.
//
// ★ 설계 원칙
//   - 저장하는 건 '뽑힌 결과'뿐이다. 필터는 이미 URL 쿼리로 직렬화되고,
//     표시 옵션은 저장 대상이 아니다.
//   - 결과는 id(+폼 인덱스)만 저장한다 — 포켓몬 객체를 통째로 넣지 않는다
//     (데이터가 갱신돼도 저장본이 낡지 않도록).
//   - localStorage 내용은 신뢰하지 않는다. 사용자가 직접 고칠 수도 있고
//     이전 버전이 남아 있을 수도 있으므로 읽을 때 전부 검증하고,
//     조금이라도 어긋나면 통째로 버린다(= 저장 없음으로 취급).
//   - 사생활 보호 모드 등에서 localStorage 접근 자체가 예외를 던지므로
//     모든 접근을 try/catch 로 감싼다. 저장 실패는 조용히 무시한다.
//
// 순수 검증 로직이라 pokedex(JSON) 를 import 하지 않는다. '실제로 존재하는
// 도감 번호인지'는 호출부가 knownId 로 넘긴다.

import type { PartySlot } from "./appState";
import type { StarterRoll, IVs } from "../../src/lib/starter";
import { MAX_PARTY } from "./appState";

// 스키마가 바뀌면 v2 로 올린다 (예전 키는 자연히 무시된다).
const STORAGE_KEY = "rp:party:v1";

// 저장 대상 — AppState 중 '뽑힌 포켓몬'에 해당하는 부분만.
export interface PersistedParty {
  result: PartySlot[];
  selectedId: number | null;
  selectedForm: number | null;
  roll: StarterRoll | null;
}

const IV_KEYS: (keyof IVs)[] = ["hp", "atk", "def", "spa", "spd", "spe"];

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isIndex(v: unknown): v is number {
  return typeof v === "number" && Number.isInteger(v) && v >= 0;
}

// null 이거나 0 이상 정수
function isNullableIndex(v: unknown): v is number | null {
  return v === null || isIndex(v);
}

function parseSlot(v: unknown, knownId: (id: number) => boolean): PartySlot | null {
  if (!isObject(v)) return null;
  if (!isIndex(v.id) || !knownId(v.id)) return null;
  if (!isNullableIndex(v.form)) return null;
  // 폼 인덱스가 범위를 벗어나도 viewOf 가 원종으로 처리하므로 그대로 둔다.
  return { id: v.id, form: v.form };
}

function parseIvs(v: unknown): IVs | null {
  if (!isObject(v)) return null;
  const out = {} as IVs;
  for (const k of IV_KEYS) {
    const n = v[k];
    if (typeof n !== "number" || !Number.isInteger(n) || n < 0 || n > 31) {
      return null;
    }
    out[k] = n;
  }
  return out;
}

function parseRoll(v: unknown): StarterRoll | null | undefined {
  if (v === null) return null; // 스타팅 롤 없음 — 정상 값
  if (!isObject(v)) return undefined; // 형식 오류
  if (typeof v.natureKey !== "string") return undefined;
  const ivs = parseIvs(v.ivs);
  if (!ivs) return undefined;

  let ability: StarterRoll["ability"] = null;
  if (v.ability !== null && v.ability !== undefined) {
    if (
      !isObject(v.ability) ||
      typeof v.ability.slug !== "string" ||
      typeof v.ability.isHidden !== "boolean"
    ) {
      return undefined;
    }
    ability = { slug: v.ability.slug, isHidden: v.ability.isHidden };
  }
  return { ability, natureKey: v.natureKey, ivs };
}

// JSON 문자열 → 검증된 상태. 하나라도 어긋나면 null.
export function parseParty(
  raw: string | null,
  knownId: (id: number) => boolean
): PersistedParty | null {
  if (!raw) return null;

  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isObject(data)) return null;

  if (!Array.isArray(data.result)) return null;
  if (data.result.length > MAX_PARTY) return null;
  const result: PartySlot[] = [];
  for (const item of data.result) {
    const slot = parseSlot(item, knownId);
    if (!slot) return null; // 한 칸이라도 깨졌으면 전체 폐기
    result.push(slot);
  }

  if (!isNullableIndex(data.selectedId)) return null;
  if (data.selectedId !== null && !knownId(data.selectedId)) return null;
  if (!isNullableIndex(data.selectedForm)) return null;

  const roll = parseRoll(data.roll ?? null);
  if (roll === undefined) return null;

  // 스타팅이 선택되지 않았다면 폼/롤도 비어 있어야 앞뒤가 맞는다.
  if (data.selectedId === null && (data.selectedForm !== null || roll !== null)) {
    return null;
  }

  return {
    result,
    selectedId: data.selectedId,
    selectedForm: data.selectedForm,
    roll,
  };
}

// 저장된 파티 읽기. 없거나 깨졌으면 null (호출부는 초기 상태를 그대로 쓴다).
export function loadParty(
  knownId: (id: number) => boolean
): PersistedParty | null {
  if (typeof window === "undefined") return null;
  try {
    return parseParty(window.localStorage.getItem(STORAGE_KEY), knownId);
  } catch {
    return null;
  }
}

// 파티 저장. 빈 파티 + 스타팅 미선택이면 키를 지운다(찌꺼기 남기지 않기).
export function saveParty(state: PersistedParty) {
  if (typeof window === "undefined") return;
  try {
    if (state.result.length === 0 && state.selectedId === null) {
      window.localStorage.removeItem(STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // 용량 초과·접근 차단 등은 무시 (다음 저장에서 다시 시도된다)
  }
}

// 저장본 삭제 (테스트/디버깅용)
export function clearParty() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // 무시
  }
}
