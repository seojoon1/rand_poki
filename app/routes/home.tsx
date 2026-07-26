import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import type { Route } from "./+types/home";
import { countPool, drawRandom, filterPool } from "../../src/lib/filter";
import { ALL_POKEMON, BY_ID } from "../lib/pokedex";
import { appReducer, MAX_PARTY } from "../lib/appState";
import type { AppState } from "../lib/appState";
import { defaultFilters, filtersToSearch, searchToFilters } from "../lib/urlFilters";
import { FilterPanel } from "../components/FilterPanel";
import { DisplayOptionsBar } from "../components/DisplayOptions";
import { PokemonCard } from "../components/PokemonCard";
import { Tabs } from "../components/Tabs";

// 상단 탭 정의
type TabKey = "starting" | "settings";
const TABS = [
  { key: "starting", label: "스타팅" },
  { key: "settings", label: "설정" },
] as const;

export function meta({}: Route.MetaArgs) {
  return [
    { title: "랜덤 포켓몬 뽑기" },
    { name: "description", content: "세대·타입·진화·종족값 조건으로 랜덤 포켓몬을 뽑아보세요." },
  ];
}

// 리듀서 초기 상태 (URL 은 마운트 후 클라이언트에서 읽어 하이드레이션 불일치 방지)
const initialState: AppState = {
  filters: defaultFilters(),
  display: { lang: "ko", showNumber: true, showTypes: true, showStats: true },
  result: [],
  requested: 0,
};

export default function Home() {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const { filters, display, result } = state;

  // ── URL ↔ filters 동기화 ───────────────────────────────────────────
  const hydrated = useRef(false);
  // (a) 마운트 시 URL 에서 조건 읽어오기
  useEffect(() => {
    if (typeof window === "undefined") return;
    const fromUrl = searchToFilters(window.location.search);
    dispatch({ type: "setFilters", filters: fromUrl });
    hydrated.current = true;
  }, []);
  // (b) filters 변경 시 URL 갱신 (결과 id 는 넣지 않음). 최초 읽기 전엔 스킵.
  useEffect(() => {
    if (!hydrated.current || typeof window === "undefined") return;
    const search = filtersToSearch(filters);
    const url = `${window.location.pathname}${search}`;
    window.history.replaceState(null, "", url);
  }, [filters]);

  // ── 실시간 카운트 (체크박스 토글마다) — 경량 countPool 사용 ─────────
  const poolCount = useMemo(
    () => countPool(ALL_POKEMON, filters),
    [filters]
  );

  // 결과 id → Pokemon 조회 (렌더 시점에 조회 → 언어 전환이 재추첨 없이 동작)
  const party = useMemo(
    () => result.map((id) => BY_ID.get(id)).filter((p): p is NonNullable<typeof p> => !!p),
    [result]
  );

  // ── 개별 리롤: 해당 슬롯 하나만 교체 ────────────────────────────────
  // 후보 = 현재 풀에서 (다른 카드와 중복 아님) + (uniqueChain 이면 다른 카드와 다른 계열)
  //        + (자기 자신과도 다른) 포켓몬.
  const candidatesForSlot = (index: number) => {
    const pool = filterPool(ALL_POKEMON, filters);
    const currentId = result[index];
    const otherIds = new Set(result.filter((_, i) => i !== index));
    let cands = pool.filter((p) => !otherIds.has(p.id) && p.id !== currentId);
    if (filters.uniqueChain) {
      const otherChains = new Set(
        result
          .filter((_, i) => i !== index)
          .map((id) => BY_ID.get(id)?.chainId)
      );
      cands = cands.filter((p) => !otherChains.has(p.chainId));
    }
    return cands;
  };

  const handleRerollOne = (index: number) => {
    const cands = candidatesForSlot(index);
    if (cands.length === 0) return; // 바꿀 후보가 없으면 유지
    const [picked] = drawRandom(cands, 1, { rng: Math.random });
    if (picked) dispatch({ type: "rerollOne", index, id: picked.id });
  };

  // ── 추가: 파티에 한 장 덧붙임 (최대 6장) ────────────────────────────
  // 후보 = 현재 풀에서 이미 파티에 있는 것 제외 (+ uniqueChain 이면 같은 계열도 제외)
  const candidatesForAdd = () => {
    if (result.length >= MAX_PARTY) return [];
    const pool = filterPool(ALL_POKEMON, filters);
    const usedIds = new Set(result);
    let cands = pool.filter((p) => !usedIds.has(p.id));
    if (filters.uniqueChain) {
      const usedChains = new Set(result.map((id) => BY_ID.get(id)?.chainId));
      cands = cands.filter((p) => !usedChains.has(p.chainId));
    }
    return cands;
  };

  const handleAddOne = () => {
    const cands = candidatesForAdd();
    if (cands.length === 0) return;
    const [picked] = drawRandom(cands, 1, { rng: Math.random });
    if (picked) dispatch({ type: "addOne", id: picked.id });
  };

  const canAdd = candidatesForAdd().length > 0;

  // 상단 탭 (화면 전환용 view 상태 — 뽑기 결과와 무관)
  const [tab, setTab] = useState<TabKey>("starting");

  return (
    <main className="mx-auto max-w-6xl p-4 text-gray-900 dark:text-gray-100">
      <h1 className="mb-3 text-2xl font-bold">랜덤 포켓몬 뽑기</h1>

      {/* 상단 탭 */}
      <div className="mb-5">
        <Tabs tabs={TABS as unknown as { key: string; label: string }[]} active={tab} onChange={(k) => setTab(k as TabKey)} />
      </div>

      {/* 설정 탭 (작업 예정) */}
      {tab === "settings" && (
        <div role="tabpanel" id="panel-settings" aria-labelledby="tab-settings">
          <p className="py-16 text-center text-gray-400">설정 (작업 예정)</p>
        </div>
      )}

      {/* 스타팅 탭 */}
      <div
        role="tabpanel"
        id="panel-starting"
        aria-labelledby="tab-starting"
        hidden={tab !== "starting"}
        className="flex flex-col gap-6 md:flex-row"
      >
        {/* ── 좌: 필터 패널 (모바일은 상단 접이식) ── */}
        <aside className="md:w-80 md:shrink-0">
          <details open>
            <summary className="cursor-pointer list-none rounded-lg bg-gray-100 px-3 py-2 font-semibold md:hidden dark:bg-gray-800">
              필터 조건 ▾
            </summary>
            <div className="mt-3">
              <FilterPanel
                filters={filters}
                onChange={(next) => dispatch({ type: "setFilters", filters: next })}
                count={poolCount}
              />
            </div>
          </details>
        </aside>

        {/* ── 우: 결과 영역 ── */}
        <section className="min-w-0 flex-1 space-y-4">
          {/* 표시 옵션 */}
          <DisplayOptionsBar
            display={display}
            onChange={(patch) => dispatch({ type: "patchDisplay", patch })}
          />

          {/* 뽑기 컨트롤: 추가 / 초기화 */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleAddOne}
              disabled={!canAdd}
              className="rounded-lg bg-accent-600 px-5 py-2 font-semibold text-white transition-colors hover:bg-accent-700 disabled:cursor-not-allowed disabled:bg-gray-300 dark:disabled:bg-gray-700"
            >
              + 추가
            </button>
            <button
              type="button"
              onClick={() => dispatch({ type: "reset" })}
              disabled={party.length === 0}
              className="rounded-lg border border-gray-300 px-4 py-2 font-semibold text-gray-700 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              초기화
            </button>
            <span className="text-sm text-gray-500 dark:text-gray-400 tabular-nums">
              {party.length} / {MAX_PARTY}
            </span>
            {poolCount === 0 && (
              <span className="text-sm text-red-600 dark:text-red-400">
                조건에 맞는 포켓몬이 없습니다
              </span>
            )}
            {poolCount > 0 && party.length < MAX_PARTY && !canAdd && (
              <span className="text-sm text-amber-600 dark:text-amber-400">
                더 추가할 후보가 없습니다
              </span>
            )}
          </div>

          {/* 결과 카드 그리드 (aria-live) */}
          <div aria-live="polite">
            {party.length === 0 ? (
              <p className="py-16 text-center text-gray-400">
                조건을 고르고 <strong>추가</strong>를 눌러 파티를 만들어보세요.
              </p>
            ) : (
              <>
                <div
                  className={
                    party.length === 1
                      ? "mx-auto max-w-sm"
                      : "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
                  }
                >
                  {party.map((p, i) => (
                    <PokemonCard
                      key={`${i}-${p.id}`}
                      pokemon={p}
                      display={display}
                      onReroll={() => handleRerollOne(i)}
                      canReroll={candidatesForSlot(i).length > 0}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
