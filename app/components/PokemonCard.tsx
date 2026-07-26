// 포켓몬 카드 (이미지 없음). 도감번호/이름/타입/종족값을 표시 옵션에 따라 렌더.
import type { Pokemon } from "../../src/lib/filter";
import type { DisplayOptions } from "../lib/appState";
import { STAT_ROWS, TYPE_COLOR, typeName, nameOf } from "../lib/pokedex";
import { StatBar } from "./StatBar";

export function PokemonCard({
  pokemon,
  display,
  onReroll,
  canReroll = true,
  onSelectStarter,
  isSelected = false,
}: {
  pokemon: Pokemon;
  display: DisplayOptions;
  // 이 카드만 다시 뽑기. 없으면 버튼을 렌더하지 않는다.
  onReroll?: () => void;
  // 후보가 없어 교체 불가하면 비활성화
  canReroll?: boolean;
  // 스타팅 탭으로 이 포켓몬 넘기기. 없으면 버튼 미표시.
  onSelectStarter?: () => void;
  // 현재 스타팅으로 선택된 카드인지
  isSelected?: boolean;
}) {
  const { lang, showNumber, showTypes, showStats } = display;
  const name = nameOf(pokemon, lang);

  return (
    <article className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      {/* 헤더: 도감번호 + 이름 + 개별 리롤 버튼 */}
      <header className="mb-3 flex items-baseline gap-2">
        {showNumber && (
          <span className="tabular-nums text-sm font-mono text-gray-400">
            #{String(pokemon.id).padStart(3, "0")}
          </span>
        )}
        <h3 className="text-lg font-bold">{name}</h3>
        {onReroll && (
          <button
            type="button"
            onClick={onReroll}
            disabled={!canReroll}
            aria-label={`${name} 다시 뽑기`}
            title="이 카드만 다시 뽑기"
            className="ml-auto shrink-0 rounded-md px-2 py-1 text-sm text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800 disabled:cursor-not-allowed disabled:opacity-40 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-100"
          >
            🎲 리롤
          </button>
        )}
      </header>

      {/* 타입 뱃지 */}
      {showTypes && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {pokemon.types.map((t) => (
            <span
              key={t}
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${TYPE_COLOR[t]}`}
            >
              {typeName(t, lang)}
            </span>
          ))}
        </div>
      )}

      {/* 종족값 */}
      {showStats && (
        <div className="space-y-1.5">
          {STAT_ROWS.map((row) => (
            <StatBar
              key={row.key}
              label={row.label}
              value={pokemon.stats[row.key]}
            />
          ))}
          {/* 총합은 막대 없이 숫자만, 구분선 아래 */}
          <div className="mt-2 flex items-center justify-between border-t border-gray-200 pt-2 dark:border-gray-700">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              총합
            </span>
            <span className="tabular-nums text-base font-bold">
              {pokemon.stats.total}
            </span>
          </div>
        </div>
      )}

      {/* 스타팅 선택 */}
      {onSelectStarter && (
        <button
          type="button"
          onClick={onSelectStarter}
          aria-pressed={isSelected}
          className={`mt-3 w-full rounded-lg border px-3 py-1.5 text-sm font-semibold transition-colors ${
            isSelected
              ? "border-accent-600 bg-accent-50 text-accent-700 dark:border-accent-400 dark:bg-accent-950 dark:text-accent-300"
              : "border-gray-300 text-gray-600 hover:border-accent-500 hover:text-accent-600 dark:border-gray-600 dark:text-gray-300 dark:hover:border-accent-400"
          }`}
        >
          {isSelected ? "✓ 스타팅 선택됨" : "스타팅 선택"}
        </button>
      )}
    </article>
  );
}
