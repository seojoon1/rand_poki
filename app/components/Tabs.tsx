// 상단 탭 바 (WAI-ARIA tablist 패턴).
// 좌우 화살표/Home/End 키로 탭 이동, 클릭/Enter 로 선택.
// 각 탭 버튼 id = `tab-${key}`, 대응 패널 id = `panel-${key}` 규칙을 쓴다.
import { useRef } from "react";

export interface TabDef {
  key: string;
  label: string;
}

export function Tabs({
  tabs,
  active,
  onChange,
}: {
  tabs: TabDef[];
  active: string;
  onChange: (key: string) => void;
}) {
  const btnRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // 화살표 키로 인접 탭에 포커스 이동 + 선택
  const onKeyDown = (e: React.KeyboardEvent, index: number) => {
    let next = index;
    if (e.key === "ArrowRight") next = (index + 1) % tabs.length;
    else if (e.key === "ArrowLeft") next = (index - 1 + tabs.length) % tabs.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = tabs.length - 1;
    else return;
    e.preventDefault();
    onChange(tabs[next].key);
    btnRefs.current[next]?.focus();
  };

  return (
    <div
      role="tablist"
      aria-label="화면 전환"
      className="flex gap-1 border-b border-gray-200 dark:border-gray-700"
    >
      {tabs.map((t, i) => {
        const selected = t.key === active;
        return (
          <button
            key={t.key}
            ref={(el) => {
              btnRefs.current[i] = el;
            }}
            role="tab"
            id={`tab-${t.key}`}
            aria-selected={selected}
            aria-controls={`panel-${t.key}`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(t.key)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-semibold transition-colors ${
              selected
                ? "border-accent-600 text-accent-600 dark:border-accent-400 dark:text-accent-400"
                : "border-transparent text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-100"
            }`}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
