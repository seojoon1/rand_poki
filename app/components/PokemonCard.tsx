// 포켓몬 카드. 도트 이미지/도감번호/이름/타입/종족값을 표시 옵션에 따라 렌더.
// 리전폼·고유 폼이 있는 포켓몬은 헤더 아래에서 모습을 바꿀 수 있다.
import type { DisplayOptions } from "../lib/appState";
import type { PokemonView } from "../lib/pokedex";
import {
  STAT_ROWS,
  TYPE_COLOR,
  typeName,
  nameOf,
  formNameOf,
} from "../lib/pokedex";
import { Sprite } from "./Sprite";
import { StatBar } from "./StatBar";

export function PokemonCard({
  pokemon,
  display,
  onReroll,
  canReroll = true,
  onRemove,
  onSetForm,
  onSelectStarter,
  isSelected = false,
  stackName = false,
}: {
  // 원종 + 선택된 모습을 합친 뷰 (pokedex.viewOf)
  pokemon: PokemonView;
  display: DisplayOptions;
  // 이 카드만 다시 뽑기. 없으면 버튼을 렌더하지 않는다.
  onReroll?: () => void;
  // 후보가 없어 교체 불가하면 비활성화
  canReroll?: boolean;
  // 이 카드만 파티에서 삭제. 없으면 버튼을 렌더하지 않는다.
  onRemove?: () => void;
  // 모습 변경 (null = 원종). 없으면 폼 선택 UI 를 렌더하지 않는다.
  onSetForm?: (form: number | null) => void;
  // 스타팅 탭으로 이 포켓몬 넘기기. 없으면 버튼 미표시.
  onSelectStarter?: () => void;
  // 현재 스타팅으로 선택된 카드인지
  isSelected?: boolean;
  // 카드가 좁을 때(파티 2마리 이상) 이름을 도감번호 아래 줄로 내린다.
  // 한 줄에 번호+이름+버튼을 같이 두면 긴 이름이 글자 단위로 쪼개진다.
  stackName?: boolean;
}) {
  const { lang, showImage, showNumber, showTypes, showStats } = display;
  const name = nameOf(pokemon, lang);
  // 폼이 걸려 있으면 이미지 alt·버튼 라벨에 모습까지 밝힌다.
  const fullName = pokemon.formLabel ? `${name} (${pokemon.formLabel})` : name;

  return (
    <article className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      {/* 헤더: 도감번호 + 이름 + 개별 리롤/삭제 버튼.
          stackName 이면 order 로 이름을 마지막으로 보내고 w-full 로 줄을 넘긴다
          → 1행 [#번호 … 리롤 삭제] / 2행 [이름]. 마크업은 한 벌만 유지한다. */}
      <header className="mb-3 flex flex-wrap items-baseline gap-x-2">
        {showNumber && (
          <span className="order-1 tabular-nums text-sm font-mono text-gray-400">
            #{String(pokemon.id).padStart(3, "0")}
          </span>
        )}
        {/* 이름은 포켓몬 위키 링크. break-keep 으로 한국어 이름이 글자 단위로
            쪼개지지 않게 한다 (줄이 넘칠 땐 단어째로 넘어간다). */}
        <h3
          className={`text-lg font-bold leading-tight break-keep ${
            stackName ? "order-3 mt-0.5 w-full" : "order-2"
          }`}
        >
          <a
            href={`https://pokemon.fandom.com/ko/wiki/${name}_(포켓몬)#출현장소`}
            target="_blank"
            rel="noopener noreferrer"
          >
            {name}
          </a>
          {/* 선택된 모습은 이름 옆에 작게 (도감번호는 원종 것을 그대로 쓴다) */}
          {pokemon.formLabel && (
            <span className="ml-1.5 align-middle text-xs font-semibold text-accent-600 dark:text-accent-400">
              {pokemon.formLabel}
            </span>
          )}
        </h3>
        <div
          className={`ml-auto flex shrink-0 items-center gap-1 ${
            stackName ? "order-2" : "order-3"
          }`}
        >
          {onReroll && (
            <button
              type="button"
              onClick={onReroll}
              disabled={!canReroll}
              aria-label={`${fullName} 다시 뽑기`}
              title="이 카드만 다시 뽑기"
              className="rounded-md px-2 py-1 text-sm text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800 disabled:cursor-not-allowed disabled:opacity-40 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-100"
            >
              🎲 리롤
            </button>
          )}
          {onRemove && (
            <button
              type="button"
              onClick={onRemove}
              aria-label={`${fullName} 삭제`}
              title="이 카드만 삭제"
              className="rounded-md px-2 py-1 text-sm text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-gray-400 dark:hover:bg-red-950 dark:hover:text-red-400"
            >
              ✕ 삭제
            </button>
          )}
        </div>
      </header>

      {/* 모습 선택 (리전폼/고유 폼이 있을 때만). 로토무처럼 폼이 5개인 경우도
          있어 뱃지 나열 대신 select 로 둔다 — 좁은 카드에서도 한 줄로 끝난다. */}
      {onSetForm && pokemon.forms.length > 0 && (
        <div className="mb-3">
          <select
            value={pokemon.formIndex ?? ""}
            onChange={(e) =>
              onSetForm(e.target.value === "" ? null : Number(e.target.value))
            }
            aria-label={`${name} 모습 선택`}
            title="다른 모습 (리전폼 등)"
            className="w-full rounded-md border border-gray-200 bg-gray-50 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-900/40"
          >
            <option value="">기본 모습</option>
            {pokemon.forms.map((f, i) => (
              <option key={f.slug} value={i}>
                {formNameOf(f, lang)}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* 도트 이미지 (폼이 걸려 있으면 폼 스프라이트) */}
      {showImage && (
        <div className="mb-3 flex justify-center rounded-lg bg-gray-50 py-2 dark:bg-gray-900/40">
          <Sprite id={pokemon.spriteId} name={fullName} size={112} />
        </div>
      )}

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
