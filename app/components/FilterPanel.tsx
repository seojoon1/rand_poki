// 뽑기 조건(filters) 패널. 변경 시 onChange 로 새 FilterOptions 를 올려보낸다.
// filter.ts 로직은 여기서 재구현하지 않는다 (countPool 은 상위에서 계산해 전달).
import type { FilterOptions, PokemonType, Stage } from "../../src/lib/filter";
import {
  ALL_GENS,
  ALL_TYPES,
  ALL_STAGES,
  STAT_TOTAL_MIN,
  STAT_TOTAL_MAX,
  STAGE_LABEL,
  TYPE_COLOR,
  typeName,
} from "../lib/pokedex";

// Set 토글 헬퍼: 있으면 빼고 없으면 넣은 새 Set 반환 (불변)
function toggle<T>(set: Set<T>, value: T): Set<T> {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

export function FilterPanel({
  filters,
  onChange,
  count,
}: {
  filters: FilterOptions;
  onChange: (next: FilterOptions) => void;
  count: number;
}) {
  // 부분 변경 헬퍼
  const patch = (p: Partial<FilterOptions>) => onChange({ ...filters, ...p });

  // 종족값 슬라이더 현재값 (미설정이면 전체 범위 표시하되 필터는 무제한)
  const stActive = !!filters.statTotal;
  const stLo = filters.statTotal?.[0] ?? STAT_TOTAL_MIN;
  const stHi = filters.statTotal?.[1] ?? STAT_TOTAL_MAX;

  return (
    <div className="space-y-5 text-sm">
      {/* 실시간 카운트 */}
      <div
        className={`rounded-lg px-3 py-2 font-semibold ${
          count === 0
            ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
            : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200"
        }`}
        aria-live="polite"
      >
        조건에 맞는 포켓몬 {count.toLocaleString()}마리
      </div>

      {/* 1. 세대 */}
      <fieldset className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
        <legend className="flex items-center gap-2 px-1 font-semibold">
          세대
          <SelectAllToggle
            all={ALL_GENS as unknown as number[]}
            current={filters.gens}
            onAll={(s) => patch({ gens: s })}
          />
        </legend>
        <div className="mt-1 grid grid-cols-5 gap-1">
          {ALL_GENS.map((g) => (
            <Check
              key={g}
              label={`${g}`}
              checked={filters.gens.has(g)}
              onChange={() => patch({ gens: toggle(filters.gens, g) })}
            />
          ))}
        </div>
      </fieldset>

      {/* 2. 타입 */}
      <fieldset className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
        <legend className="flex items-center gap-2 px-1 font-semibold">
          타입
          <SelectAllToggle
            all={ALL_TYPES}
            current={filters.types}
            onAll={(s) => patch({ types: s })}
          />
        </legend>
        <div className="mt-1 grid grid-cols-3 gap-1">
          {ALL_TYPES.map((t) => (
            <label
              key={t}
              className="flex cursor-pointer items-center gap-1.5 rounded px-1 py-0.5 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <input
                type="checkbox"
                checked={filters.types.has(t)}
                onChange={() => patch({ types: toggle(filters.types, t) })}
                className="accent-emerald-500"
              />
              <span
                className={`rounded px-1.5 text-xs font-medium ${TYPE_COLOR[t]}`}
              >
                {typeName(t, "ko")}
              </span>
            </label>
          ))}
        </div>
        {/* 타입 매칭 모드 */}
        <div className="mt-2 space-y-1 border-t border-gray-200 pt-2 dark:border-gray-700">
          <Check
            label="정확한 일치 (선택 타입만으로 구성)"
            checked={filters.typeMode === "exact"}
            onChange={() =>
              patch({ typeMode: filters.typeMode === "exact" ? "any" : "exact" })
            }
          />
          <Check
            label="이중 타입만"
            checked={filters.dualOnly}
            onChange={() => patch({ dualOnly: !filters.dualOnly })}
          />
        </div>
      </fieldset>

      {/* 3. 진화 단계 */}
      <fieldset className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
        <legend className="px-1 font-semibold">진화 단계</legend>
        <div className="mt-1 flex gap-3">
          {ALL_STAGES.map((s: Stage) => (
            <Check
              key={s}
              label={STAGE_LABEL[s]}
              checked={filters.stages.has(s)}
              onChange={() => patch({ stages: toggle(filters.stages, s) })}
            />
          ))}
        </div>
      </fieldset>

      {/* 4. 종족값 총합 (듀얼 핸들 슬라이더) */}
      <fieldset className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
        <legend className="flex items-center gap-2 px-1 font-semibold">
          종족값 총합
          {stActive && (
            <button
              type="button"
              onClick={() => patch({ statTotal: undefined })}
              className="rounded px-1.5 text-xs font-normal text-emerald-600 hover:underline dark:text-emerald-400"
            >
              초기화
            </button>
          )}
        </legend>
        <div className="mt-1 flex items-center justify-between tabular-nums text-gray-600 dark:text-gray-300">
          <span>{stLo}</span>
          <span className="text-xs text-gray-400">
            {stActive ? "" : "무제한"}
          </span>
          <span>{stHi}</span>
        </div>
        {/* 두 range 를 겹쳐 듀얼 핸들 구현 */}
        <div className="relative mt-1 h-6">
          <input
            type="range"
            aria-label="종족값 총합 최소"
            min={STAT_TOTAL_MIN}
            max={STAT_TOTAL_MAX}
            value={stLo}
            onChange={(e) => {
              const lo = Math.min(Number(e.target.value), stHi);
              patch({ statTotal: [lo, stHi] });
            }}
            className="pointer-events-none absolute inset-x-0 top-2 h-2 w-full appearance-none bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:accent-emerald-500 accent-emerald-500"
          />
          <input
            type="range"
            aria-label="종족값 총합 최대"
            min={STAT_TOTAL_MIN}
            max={STAT_TOTAL_MAX}
            value={stHi}
            onChange={(e) => {
              const hi = Math.max(Number(e.target.value), stLo);
              patch({ statTotal: [stLo, hi] });
            }}
            className="pointer-events-none absolute inset-x-0 top-2 h-2 w-full appearance-none bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto accent-emerald-500"
          />
        </div>
      </fieldset>

      {/* 5. 기타 */}
      <fieldset className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
        <legend className="px-1 font-semibold">기타</legend>
        <div className="mt-1 space-y-1">
          <Check
            label="전설·환상 제외"
            checked={!!filters.excludeLegendary}
            onChange={() =>
              patch({ excludeLegendary: !filters.excludeLegendary })
            }
          />
          <Check
            label="같은 진화 계열 중복 방지"
            checked={!!filters.uniqueChain}
            onChange={() => patch({ uniqueChain: !filters.uniqueChain })}
          />
        </div>
      </fieldset>
    </div>
  );
}

// ── 재사용 체크박스 ──────────────────────────────────────────────────
function Check({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-1.5 rounded px-1 py-0.5 hover:bg-gray-100 dark:hover:bg-gray-800">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="accent-emerald-500"
      />
      <span>{label}</span>
    </label>
  );
}

// ── 전체선택/해제 토글 ───────────────────────────────────────────────
function SelectAllToggle<T>({
  all,
  current,
  onAll,
}: {
  all: T[];
  current: Set<T>;
  onAll: (s: Set<T>) => void;
}) {
  const allOn = current.size === all.length;
  return (
    <button
      type="button"
      onClick={() => onAll(allOn ? new Set<T>() : new Set<T>(all))}
      className="rounded px-1.5 text-xs font-normal text-emerald-600 hover:underline dark:text-emerald-400"
    >
      {allOn ? "전체 해제" : "전체 선택"}
    </button>
  );
}
