// 스타팅 탭: 좌측 '능력치 설정'(특성/개체값/성격을 하나씩 롤·선택) +
// 우측 '최종 능력치'(레벨50 실능력치, 기본+보너스 2톤 막대).
// 돌리기 시 슬롯머신식 스핀 애니메이션 + 막대가 차오르는 트랜지션.
import { useEffect, useRef, useState } from "react";
import type { Pokemon } from "../../src/lib/filter";
import type { StarterRoll, IVs, NatureStat } from "../../src/lib/starter";
import { NATURES, getNature, finalStats } from "../../src/lib/starter";
import type { LangCode } from "../lib/pokedex";
import { abilityName, nameOf, typeName, TYPE_COLOR } from "../lib/pokedex";
import { isMuted, setMuted, tick, land, jackpot } from "../lib/sound";

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

// 시스템이 모션 최소화를 원하는지 (스핀 애니메이션 생략)
function prefersReduced(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

// 롤이 커밋된 뒤(= 새 값이 그려진 렌더에서) 착지음을 울린다.
// 값이 이전과 같아도 seq 는 매번 증가하므로 항상 소리가 난다.
function useSettleSound(seq: number, isJackpot: boolean) {
  useEffect(() => {
    if (seq === 0) return; // 최초 마운트에는 울리지 않음
    if (isJackpot) jackpot();
    else land();
    // seq 만 트리거로 삼는다 (isJackpot 은 같은 렌더의 최신 값을 읽음)
  }, [seq]);
}

// 슬롯머신 스핀: duration 동안 interval 마다 onTick, 끝나면 onDone(실제 커밋).
function useSpinner() {
  const [spinning, setSpinning] = useState(false);
  const ref = useRef<{ iv?: number; to?: number }>({});
  useEffect(
    () => () => {
      if (ref.current.iv) clearInterval(ref.current.iv);
      if (ref.current.to) clearTimeout(ref.current.to);
    },
    []
  );
  const run = (
    onTick: () => void,
    onDone: () => void,
    duration = 500,
    interval = 55
  ) => {
    if (spinning) return;
    if (prefersReduced()) {
      onDone();
      return;
    }
    setSpinning(true);
    // 첫 딸깍은 클릭 핸들러 안에서 (자동재생 정책상 여기서 AudioContext 가 열림)
    tick();
    ref.current.iv = window.setInterval(() => {
      onTick();
      tick();
    }, interval);
    ref.current.to = window.setTimeout(() => {
      clearInterval(ref.current.iv);
      setSpinning(false);
      onDone();
    }, duration);
  };
  return { spinning, run };
}

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
      <p className="py-16 text-center text-lg text-gray-400">
        <strong>뽑기</strong> 탭에서 포켓몬의 <strong>스타팅 선택</strong>을
        누르면 여기서 특성·성격·개체값을 돌릴 수 있어요.
      </p>
    );
  }

  const nature = getNature(roll.natureKey);
  const fs = finalStats(pokemon.stats, roll.ivs, roll.natureKey);
  const maxTotal = Math.max(...STAT_META.map((m) => fs[m.key].total), 1);

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* ── 좌: 능력치 설정 ── */}
      <section className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
        <div className="mb-4 flex items-center">
          <h2 className="text-lg font-bold">능력치 설정</h2>
          <SoundToggle />
        </div>

        {/* 특성 */}
        <AbilityControl
          label="특성"
          pokemon={pokemon}
          ability={roll.ability}
          lang={lang}
          onReroll={handlers.onRerollAbility}
        />

        {/* 개체값 6종 */}
        {STAT_META.map((m) => (
          <IvControl
            key={m.key}
            label={m.label}
            value={roll.ivs[m.key]}
            onSet={(v) => handlers.onSetIv(m.key, v)}
            onReroll={() => handlers.onRerollIv(m.key)}
          />
        ))}

        {/* 성격 */}
        <NatureControl
          natureKey={roll.natureKey}
          onSet={handlers.onSetNature}
          onReroll={handlers.onRerollNature}
        />
        <p className="mt-2 text-center text-sm text-gray-500 dark:text-gray-400">
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
      <section className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
        <div className="mb-4 flex items-center gap-2">
          <span className="font-mono text-base text-gray-400">
            #{String(pokemon.id).padStart(3, "0")}
          </span>
          <h2 className="text-xl font-bold">{nameOf(pokemon, lang)}</h2>
          <span className="ml-auto flex gap-1">
            {pokemon.types.map((t) => (
              <span
                key={t}
                className={`rounded-full px-2.5 py-1 text-sm font-semibold ${TYPE_COLOR[t]}`}
              >
                {typeName(t, lang)}
              </span>
            ))}
          </span>
        </div>

        <div className="mb-3 border-l-4 border-accent-500 pl-2.5 text-base font-semibold">
          최종 능력치 (기본+보너스) · Lv.50
        </div>

        <div className="space-y-3">
          {STAT_META.map((m) => {
            const s = fs[m.key];
            const basePct = (s.basePart / maxTotal) * 100;
            const bonusPct = (s.bonus / maxTotal) * 100;
            return (
              <div key={m.key} className="flex items-center gap-3 text-base">
                <span className="w-16 shrink-0 text-gray-500 dark:text-gray-400">
                  {m.label}
                </span>
                <div
                  className="flex h-6 flex-1 overflow-hidden rounded bg-gray-200 dark:bg-gray-700"
                  role="meter"
                  aria-label={`${m.label} 최종 능력치`}
                  aria-valuenow={s.total}
                  aria-valuemin={0}
                  aria-valuemax={maxTotal}
                >
                  {/* 기본(진한색) + 보너스(연한색) 2톤, 폭 변화는 트랜지션 */}
                  <div
                    className={`${m.base} transition-[width] duration-500 ease-out motion-reduce:transition-none`}
                    style={{ width: `${basePct}%` }}
                  />
                  <div
                    className={`${m.bonus} transition-[width] duration-500 ease-out motion-reduce:transition-none`}
                    style={{ width: `${bonusPct}%` }}
                  />
                </div>
                {/* 값이 바뀔 때 key 변경으로 pop 애니메이션 재생 */}
                <span
                  key={s.total}
                  className="w-12 shrink-0 animate-pop text-right text-lg font-bold tabular-nums"
                >
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

// ── 효과음 켬/끔 (localStorage 에 유지) ──────────────────────────────
function SoundToggle() {
  // 서버 렌더에서는 항상 '켬'으로 그리고, 마운트 후 저장값을 반영해
  // 하이드레이션 불일치를 피한다.
  const [off, setOff] = useState(false);
  useEffect(() => setOff(isMuted()), []);

  return (
    <button
      type="button"
      onClick={() => {
        const next = !off;
        setOff(next);
        setMuted(next);
        if (!next) land(); // 켤 때 한 번 들려줌
      }}
      aria-pressed={off}
      aria-label={off ? "효과음 켜기" : "효과음 끄기"}
      title={off ? "효과음 켜기" : "효과음 끄기"}
      className="ml-auto rounded-md px-2 py-1 text-lg text-gray-500 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
    >
      {off ? "🔇" : "🔊"}
    </button>
  );
}

// ── 개체값 한 줄 (슬롯 스핀 + 직접 입력) ─────────────────────────────
function IvControl({
  label,
  value,
  onSet,
  onReroll,
}: {
  label: string;
  value: number;
  onSet: (v: number) => void;
  onReroll: () => void;
}) {
  const { spinning, run } = useSpinner();
  const [spinVal, setSpinVal] = useState(value);
  const [seq, setSeq] = useState(0);
  const shown = spinning ? spinVal : value;
  const perfect = !spinning && value === IV_MAX;

  // 31 이 나오면 착지음 대신 대박음
  useSettleSound(seq, value === IV_MAX);

  const roll = () =>
    run(
      () => setSpinVal(Math.floor(Math.random() * (IV_MAX + 1))),
      () => {
        setSeq((s) => s + 1);
        onReroll();
      }
    );

  return (
    <div className="mb-2.5 flex items-center gap-2.5">
      <span className="w-16 shrink-0 text-base font-medium">{label}</span>
      <input
        type="number"
        min={0}
        max={IV_MAX}
        value={shown}
        disabled={spinning}
        aria-label={`${label} 개체값`}
        onChange={(e) => {
          const v = Number(e.target.value);
          const clamped = Number.isFinite(v)
            ? Math.max(0, Math.min(IV_MAX, Math.floor(v)))
            : 0;
          onSet(clamped);
        }}
        className={`h-11 flex-1 rounded-md border px-2 text-center text-base tabular-nums dark:bg-gray-900/40 ${
          perfect
            ? "border-accent-500 bg-accent-50 font-semibold text-accent-700 dark:border-accent-400 dark:text-accent-300"
            : "border-gray-200 bg-gray-50 dark:border-gray-600"
        }`}
      />
      <RollButton
        onClick={roll}
        disabled={spinning}
        label={`${label} 개체값 다시 뽑기`}
        spinning={spinning}
      />
    </div>
  );
}

// ── 성격 (드롭다운 + 스핀) ───────────────────────────────────────────
function NatureControl({
  natureKey,
  onSet,
  onReroll,
}: {
  natureKey: string;
  onSet: (key: string) => void;
  onReroll: () => void;
}) {
  const { spinning, run } = useSpinner();
  const [spinKey, setSpinKey] = useState(natureKey);
  const [seq, setSeq] = useState(0);

  useSettleSound(seq, false);

  const roll = () =>
    run(
      () => setSpinKey(NATURES[Math.floor(Math.random() * NATURES.length)].key),
      () => {
        setSeq((s) => s + 1);
        onReroll();
      }
    );

  return (
    <div className="mt-4 flex items-center gap-2.5">
      <span className="w-16 shrink-0 text-base text-gray-500 dark:text-gray-400">
        성격
      </span>
      {spinning ? (
        // 스핀 중에는 셀렉트 대신 이름만 빠르게 갈아끼움
        <div className="flex h-11 flex-1 items-center justify-center rounded-md border border-gray-200 bg-gray-50 px-2 text-base dark:border-gray-600 dark:bg-gray-900/40">
          {getNature(spinKey)?.ko ?? spinKey}
        </div>
      ) : (
        <select
          value={natureKey}
          aria-label="성격 선택"
          onChange={(e) => onSet(e.target.value)}
          className="h-11 flex-1 rounded-md border border-gray-200 bg-gray-50 px-2 text-base dark:border-gray-600 dark:bg-gray-900/40"
        >
          {NATURES.map((n) => (
            <option key={n.key} value={n.key}>
              {n.ko}
            </option>
          ))}
        </select>
      )}
      <RollButton
        onClick={roll}
        disabled={spinning}
        label="성격 다시 뽑기"
        spinning={spinning}
      />
    </div>
  );
}

// ── 특성 (스핀) ──────────────────────────────────────────────────────
function AbilityControl({
  label,
  pokemon,
  ability,
  lang,
  onReroll,
}: {
  label: string;
  pokemon: Pokemon;
  ability: StarterRoll["ability"];
  lang: LangCode;
  onReroll: () => void;
}) {
  const { spinning, run } = useSpinner();
  const [spinSlug, setSpinSlug] = useState<string | null>(null);
  const [seq, setSeq] = useState(0);
  const noAbilities = pokemon.abilities.length === 0;

  // 숨김특성이면 대박음
  useSettleSound(seq, !!ability?.isHidden);

  const roll = () =>
    run(
      () => {
        const a =
          pokemon.abilities[
            Math.floor(Math.random() * pokemon.abilities.length)
          ];
        setSpinSlug(a?.slug ?? null);
      },
      () => {
        setSeq((s) => s + 1);
        onReroll();
      }
    );

  return (
    <div className="mb-2.5 flex items-center gap-2.5">
      <span className="w-16 shrink-0 text-base text-gray-500 dark:text-gray-400">
        {label}
      </span>
      <div className="flex h-11 flex-1 items-center gap-1.5 rounded-md border border-gray-200 bg-gray-50 px-2.5 text-base dark:border-gray-600 dark:bg-gray-900/40">
        {spinning ? (
          <span className="font-medium">
            {spinSlug ? abilityName(spinSlug, lang) : "…"}
          </span>
        ) : ability ? (
          <>
            <span className="font-medium">{abilityName(ability.slug, lang)}</span>
            {ability.isHidden && (
              <span className="rounded bg-accent-100 px-1.5 py-0.5 text-sm font-medium text-accent-700 dark:bg-accent-950 dark:text-accent-300">
                숨김
              </span>
            )}
          </>
        ) : (
          <span className="text-gray-400">—</span>
        )}
      </div>
      <RollButton
        onClick={roll}
        disabled={noAbilities || spinning}
        label="특성 다시 뽑기"
        spinning={spinning}
      />
    </div>
  );
}

// 공통 '돌리기' 버튼 (accent 색 — 디자인 시스템 일관성)
function RollButton({
  onClick,
  label,
  disabled = false,
  spinning = false,
}: {
  onClick: () => void;
  label: string;
  disabled?: boolean;
  spinning?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="h-11 shrink-0 rounded-md bg-accent-600 px-4 text-base font-semibold text-white transition-colors hover:bg-accent-700 active:scale-95 disabled:cursor-not-allowed disabled:bg-gray-300 dark:disabled:bg-gray-700"
    >
      <span className={spinning ? "inline-block animate-spin" : ""}>🎲</span>{" "}
      돌리기
    </button>
  );
}
