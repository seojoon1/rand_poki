// 표시 옵션 영역 (필터와 시각적으로 구분). 변경 즉시 반영, 재추첨 없음.
import type { DisplayOptions } from "../lib/appState";
import { LANGS } from "../lib/pokedex";

export function DisplayOptionsBar({
  display,
  onChange,
}: {
  display: DisplayOptions;
  onChange: (patch: Partial<DisplayOptions>) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-dashed border-gray-300 bg-gray-50 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800/50">
      <span className="font-semibold text-gray-500 dark:text-gray-400">
        표시
      </span>

      {/* 이름 언어 */}
      <label className="flex items-center gap-1.5">
        <span className="text-gray-600 dark:text-gray-300">언어</span>
        <select
          value={display.lang}
          onChange={(e) =>
            onChange({ lang: e.target.value as DisplayOptions["lang"] })
          }
          className="rounded border border-gray-300 bg-white px-2 py-1 dark:border-gray-600 dark:bg-gray-700"
        >
          {LANGS.map((l) => (
            <option key={l.code} value={l.code}>
              {l.label}
            </option>
          ))}
        </select>
      </label>

      <ToggleLabel
        label="도감번호"
        checked={display.showNumber}
        onChange={() => onChange({ showNumber: !display.showNumber })}
      />
      <ToggleLabel
        label="타입"
        checked={display.showTypes}
        onChange={() => onChange({ showTypes: !display.showTypes })}
      />
      <ToggleLabel
        label="종족값"
        checked={display.showStats}
        onChange={() => onChange({ showStats: !display.showStats })}
      />
    </div>
  );
}

function ToggleLabel({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-1.5">
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
