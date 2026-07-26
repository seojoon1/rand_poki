// 스타팅 탭 화면: 뽑기에서 선택한 포켓몬의 특성/성격/개체값(0~31)을 랜덤으로 롤.
import type { Pokemon } from "../../src/lib/filter";
import type { StarterRoll, NatureStat } from "../../src/lib/starter";
import { getNature } from "../../src/lib/starter";
import type { LangCode } from "../lib/pokedex";
import { abilityName, nameOf, typeName, TYPE_COLOR } from "../lib/pokedex";

// 성격 보정 스탯 → 한국어 라벨
const NATURE_STAT_LABEL: Record<NatureStat, string> = {
  atk: "공격",
  def: "방어",
  spa: "특공",
  spd: "특방",
  spe: "스피드",
};

// 개체값 표시 순서
const IV_ROWS: { key: keyof StarterRoll["ivs"]; label: string }[] = [
  { key: "hp", label: "HP" },
  { key: "atk", label: "공격" },
  { key: "def", label: "방어" },
  { key: "spa", label: "특공" },
  { key: "spd", label: "특방" },
  { key: "spe", label: "스피드" },
];

const IV_MAX = 31;

export function StarterPanel({
  pokemon,
  roll,
  lang,
  onRoll,
}: {
  pokemon: Pokemon | null;
  roll: StarterRoll | null;
  lang: LangCode;
  onRoll: () => void;
}) {
  // 아직 선택 안 함
  if (!pokemon) {
    return (
      <p className="py-16 text-center text-gray-400">
        <strong>뽑기</strong> 탭에서 포켓몬의 <strong>스타팅 선택</strong>을
        누르면 여기서 특성·성격·개체값을 돌릴 수 있어요.
      </p>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-5">
      {/* 선택된 포켓몬 */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-sm text-gray-400">
            #{String(pokemon.id).padStart(3, "0")}
          </span>
          <h2 className="text-xl font-bold">{nameOf(pokemon, lang)}</h2>
        </div>
        <div className="mt-2 flex gap-1.5">
          {pokemon.types.map((t) => (
            <span
              key={t}
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${TYPE_COLOR[t]}`}
            >
              {typeName(t, lang)}
            </span>
          ))}
        </div>
      </div>

      {/* 롤 버튼 */}
      <button
        type="button"
        onClick={onRoll}
        className="w-full rounded-lg bg-accent-600 px-5 py-3 text-lg font-bold text-white transition-colors hover:bg-accent-700"
      >
        🎲 {roll ? "다시 돌리기" : "돌리기"}
      </button>

      {/* 롤 결과 */}
      {roll && (
        <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          {/* 특성 */}
          <div>
            <div className="mb-1 text-sm text-gray-500 dark:text-gray-400">
              특성
            </div>
            {roll.ability ? (
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold">
                  {abilityName(roll.ability.slug, lang)}
                </span>
                {roll.ability.isHidden && (
                  <span className="rounded bg-accent-100 px-1.5 py-0.5 text-xs font-medium text-accent-700 dark:bg-accent-950 dark:text-accent-300">
                    숨김특성
                  </span>
                )}
              </div>
            ) : (
              <span className="text-gray-400">특성 정보 없음</span>
            )}
          </div>

          {/* 성격 */}
          <div>
            <div className="mb-1 text-sm text-gray-500 dark:text-gray-400">
              성격
            </div>
            <NatureLine natureKey={roll.natureKey} />
          </div>

          {/* 개체값 */}
          <div>
            <div className="mb-1 text-sm text-gray-500 dark:text-gray-400">
              개체값 (0~31)
            </div>
            <div className="space-y-1.5">
              {IV_ROWS.map((row) => (
                <IvBar
                  key={row.key}
                  label={row.label}
                  value={roll.ivs[row.key]}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 성격 한 줄: "고집 (공격↑ 특공↓)" / 중립이면 "성실 (보정 없음)"
function NatureLine({ natureKey }: { natureKey: string }) {
  const n = getNature(natureKey);
  if (!n) return <span className="text-gray-400">{natureKey}</span>;
  const neutral = n.up === null || n.down === null;
  return (
    <div className="flex items-center gap-2">
      <span className="text-lg font-semibold">{n.ko}</span>
      {neutral ? (
        <span className="text-sm text-gray-400">보정 없음</span>
      ) : (
        <span className="text-sm">
          <span className="text-red-600 dark:text-red-400">
            {NATURE_STAT_LABEL[n.up!]}↑
          </span>{" "}
          <span className="text-blue-600 dark:text-blue-400">
            {NATURE_STAT_LABEL[n.down!]}↓
          </span>
        </span>
      )}
    </div>
  );
}

// 개체값 막대 (0~31 스케일). 31 은 강조.
function IvBar({ label, value }: { label: string; value: number }) {
  const perfect = value === IV_MAX;
  const pct = (value / IV_MAX) * 100;
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-12 shrink-0 text-gray-500 dark:text-gray-400">
        {label}
      </span>
      <span
        className={`w-8 shrink-0 text-right tabular-nums font-medium ${
          perfect ? "text-accent-600 dark:text-accent-400" : ""
        }`}
      >
        {value}
      </span>
      <div
        className="h-2.5 flex-1 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700"
        role="meter"
        aria-label={label}
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={IV_MAX}
      >
        <div
          className={`h-full rounded-full ${perfect ? "bg-accent-500" : "bg-slate-400 dark:bg-slate-500"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
