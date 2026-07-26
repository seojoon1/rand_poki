// 스타팅 탭: 좌측 '능력치 설정'(특성/개체값/성격을 하나씩 롤·선택) +
// 우측 '최종 능력치'(레벨50 실능력치, 기본+보너스 2톤 막대).
import type { Pokemon } from "../../src/lib/filter";
import type { StarterRoll, IVs, NatureStat } from "../../src/lib/starter";
import { NATURES, getNature, finalStats } from "../../src/lib/starter";
import type { LangCode } from "../lib/pokedex";
import { abilityName, nameOf, typeName, TYPE_COLOR } from "../lib/pokedex";

// 스탯 메타: 표시 순서 + 한국어 라벨 + 최종능력치 막대 색상(기본/보너스 2톤)
const STAT_META: {
  key: keyof IVs;
  label: string;
  base: string;
  bonus: string;
}[] = [
  { key: "hp", label: "HP", base: "bg-red-500", bonus: "bg-red-300" },
  { key: "atk", label: "공격", base: "bg-orange-500", bonus: "bg-orange-300" },
  { key: "def", label: "방어", base: "bg-amber-400", bonus: "bg-amber-200" },
  { key: "spa", label: "특공", base: "bg-blue-500", bonus: "bg-blue-300" },
  { key: "spd", label: "특방", base: "bg-green-500", bonus: "bg-green-300" },
  { key: "spe", label: "스피드", base: "bg-pink-500", bonus: "bg-pink-300" },
];

const NATURE_STAT_LABEL: Record<NatureStat, string> = {
  atk: "공격",
  def: "방어",
  spa: "특공",
  spd: "특방",
  spe: "스피드",
};

const IV_MAX = 31;

export interface StarterHandlers {
  onRerollIv: (stat: keyof IVs) => void;
  onSetIv: (stat: keyof IVs, value: number) => void;
  onRerollNature: () => void;
  onSetNature: (natureKey: string) => void;
  onRerollAbility: () => void;
}

export function StarterPanel({
  pokemon,
  roll,
  lang,
  handlers,
}: {
  pokemon: Pokemon | null;
  roll: StarterRoll | null;
  lang: LangCode;
  handlers: StarterHandlers;
}) {
  if (!pokemon || !roll) {
    return (
      <p className="py-16 text-center text-gray-400">
        <strong>뽑기</strong> 탭에서 포켓몬의 <strong>스타팅 선택</strong>을
        누르면 여기서 특성·성격·개체값을 돌릴 수 있어요.
      </p>
    );
  }

  const nature = getNature(roll.natureKey);
  const fs = finalStats(pokemon.stats, roll.ivs, roll.natureKey);
  // 막대 스케일: 6스탯 최종값 중 최댓값 기준 (상대 비교)
  const maxTotal = Math.max(...STAT_META.map((m) => fs[m.key].total), 1);
  const noAbilities = pokemon.abilities.length === 0;

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* ── 좌: 능력치 설정 ── */}
      <section className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <h2 className="mb-3 font-bold">능력치 설정</h2>

        {/* 특성 */}
        <div className="mb-2 flex items-center gap-2">
          <span className="w-14 shrink-0 text-sm text-gray-500 dark:text-gray-400">
            특성
          </span>
          <div className="flex flex-1 items-center gap-1.5 rounded-md border border-gray-200 bg-gray-50 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-900/40">
            {roll.ability ? (
              <>
                <span className="font-medium">
                  {abilityName(roll.ability.slug, lang)}
                </span>
                {roll.ability.isHidden && (
                  <span className="rounded bg-accent-100 px-1 text-xs font-medium text-accent-700 dark:bg-accent-950 dark:text-accent-300">
                    숨김
                  </span>
                )}
              </>
            ) : (
              <span className="text-gray-400">—</span>
            )}
          </div>
          <RollButton
            onClick={handlers.onRerollAbility}
            disabled={noAbilities}
            label="특성 다시 뽑기"
          />
        </div>

        {/* 개체값 6종 */}
        {STAT_META.map((m) => (
          <div key={m.key} className="mb-2 flex items-center gap-2">
            <span className="w-14 shrink-0 text-sm font-medium">{m.label}</span>
            <input
              type="number"
              min={0}
              max={IV_MAX}
              value={roll.ivs[m.key]}
              aria-label={`${m.label} 개체값`}
              onChange={(e) => {
                const v = Number(e.target.value);
                const clamped = Number.isFinite(v)
                  ? Math.max(0, Math.min(IV_MAX, Math.floor(v)))
                  : 0;
                handlers.onSetIv(m.key, clamped);
              }}
              className={`flex-1 rounded-md border px-2 py-1.5 text-center text-sm tabular-nums dark:bg-gray-900/40 ${
                roll.ivs[m.key] === IV_MAX
                  ? "border-accent-500 bg-accent-50 font-semibold text-accent-700 dark:border-accent-400 dark:text-accent-300"
                  : "border-gray-200 bg-gray-50 dark:border-gray-600"
              }`}
            />
            <RollButton
              onClick={() => handlers.onRerollIv(m.key)}
              label={`${m.label} 개체값 다시 뽑기`}
            />
          </div>
        ))}

        {/* 성격 */}
        <div className="mt-3 flex items-center gap-2">
          <span className="w-14 shrink-0 text-sm text-gray-500 dark:text-gray-400">
            성격
          </span>
          <select
            value={roll.natureKey}
            aria-label="성격 선택"
            onChange={(e) => handlers.onSetNature(e.target.value)}
            className="flex-1 rounded-md border border-gray-200 bg-gray-50 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-900/40"
          >
            {NATURES.map((n) => (
              <option key={n.key} value={n.key}>
                {n.ko}
              </option>
            ))}
          </select>
          <RollButton
            onClick={handlers.onRerollNature}
            label="성격 다시 뽑기"
          />
        </div>
        <p className="mt-1.5 text-center text-xs text-gray-500 dark:text-gray-400">
          {nature && nature.up && nature.down ? (
            <>
              <span className="text-red-600 dark:text-red-400">
                {NATURE_STAT_LABEL[nature.up]}↑
              </span>{" "}
              <span className="text-blue-600 dark:text-blue-400">
                {NATURE_STAT_LABEL[nature.down]}↓
              </span>
            </>
          ) : (
            "능력치 변화 없음"
          )}
        </p>
      </section>

      {/* ── 우: 최종 능력치 ── */}
      <section className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        {/* 선택 포켓몬 헤더 */}
        <div className="mb-3 flex items-center gap-2">
          <span className="font-mono text-sm text-gray-400">
            #{String(pokemon.id).padStart(3, "0")}
          </span>
          <h2 className="text-lg font-bold">{nameOf(pokemon, lang)}</h2>
          <span className="ml-auto flex gap-1">
            {pokemon.types.map((t) => (
              <span
                key={t}
                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${TYPE_COLOR[t]}`}
              >
                {typeName(t, lang)}
              </span>
            ))}
          </span>
        </div>

        <div className="mb-2 border-l-4 border-accent-500 pl-2 text-sm font-semibold">
          최종 능력치 (기본+보너스) · Lv.50
        </div>

        <div className="space-y-2">
          {STAT_META.map((m) => {
            const s = fs[m.key];
            const basePct = (s.basePart / maxTotal) * 100;
            const bonusPct = (s.bonus / maxTotal) * 100;
            return (
              <div key={m.key} className="flex items-center gap-2 text-sm">
                <span className="w-12 shrink-0 text-gray-500 dark:text-gray-400">
                  {m.label}
                </span>
                <div
                  className="flex h-4 flex-1 overflow-hidden rounded bg-gray-200 dark:bg-gray-700"
                  role="meter"
                  aria-label={`${m.label} 최종 능력치`}
                  aria-valuenow={s.total}
                  aria-valuemin={0}
                  aria-valuemax={maxTotal}
                >
                  {/* 기본(진한색) + 보너스(연한색) 2톤 */}
                  <div className={m.base} style={{ width: `${basePct}%` }} />
                  <div className={m.bonus} style={{ width: `${bonusPct}%` }} />
                </div>
                <span className="w-9 shrink-0 text-right font-bold tabular-nums">
                  {s.total}
                </span>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

// 공통 '돌리기' 버튼 (accent 색 — 디자인 시스템 일관성)
function RollButton({
  onClick,
  label,
  disabled = false,
}: {
  onClick: () => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="shrink-0 rounded-md bg-accent-600 px-2.5 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-accent-700 disabled:cursor-not-allowed disabled:bg-gray-300 dark:disabled:bg-gray-700"
    >
      돌리기
    </button>
  );
}
