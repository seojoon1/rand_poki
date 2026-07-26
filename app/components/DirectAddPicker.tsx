// '직접 추가': 랜덤 뽑기 대신 원하는 포켓몬을 이름/도감번호로 찾아 파티에 넣는다.
// 필터 조건과 무관하게 전체 도감에서 고른다 (수동 선택이므로 조건에 매이지 않음).
// 접근성: WAI-ARIA combobox 패턴 (↑/↓ 이동, Enter 추가, Esc 닫기).
import { useEffect, useMemo, useRef, useState } from "react";
import type { Pokemon } from "../../src/lib/filter";
import type { LangCode } from "../lib/pokedex";
import { ALL_POKEMON, nameOf, typeName, TYPE_COLOR } from "../lib/pokedex";

// 목록이 1000줄을 넘으면 렌더가 무거워지므로 상위 N개만 보여준다.
const MAX_RESULTS = 50;

const dexNo = (id: number) => String(id).padStart(3, "0");

// 표시 언어 이름 · 영어 이름 · slug · 도감번호로 검색.
// 숫자만 입력하면 도감번호 앞자리 매칭으로 좁힌다 (25 → 25, 250...).
function matches(p: Pokemon, q: string, lang: LangCode): boolean {
  if (!q) return true;
  if (/^\d+$/.test(q)) return String(p.id).startsWith(q);
  const needle = q.toLowerCase();
  return (
    nameOf(p, lang).toLowerCase().includes(needle) ||
    (p.names.en ?? "").toLowerCase().includes(needle) ||
    p.slug.includes(needle)
  );
}

export function DirectAddPicker({
  lang,
  inParty,
  full,
  onAdd,
}: {
  lang: LangCode;
  inParty: Set<number>;
  full: boolean; // 파티가 꽉 참
  onAdd: (id: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const results = useMemo(() => {
    const q = query.trim();
    const out: Pokemon[] = [];
    for (const p of ALL_POKEMON) {
      if (matches(p, q, lang)) out.push(p);
      if (out.length >= MAX_RESULTS) break;
    }
    return out;
  }, [query, lang]);

  // 검색어가 바뀌면 활성 항목을 첫 줄로
  useEffect(() => setActive(0), [query]);

  // 열릴 때 입력에 포커스
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // 파티가 꽉 차면 더 고를 게 없으므로 닫는다
  useEffect(() => {
    if (full) setOpen(false);
  }, [full]);

  // 바깥 클릭으로 닫기
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  // 키보드 이동 시 활성 항목이 보이도록 스크롤
  useEffect(() => {
    if (!open) return;
    listRef.current
      ?.querySelector<HTMLElement>(`[data-idx="${active}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  const add = (p: Pokemon) => {
    if (inParty.has(p.id)) return;
    onAdd(p.id);
    // 연속으로 더 담을 수 있게 열어둔 채 검색어만 비운다
    setQuery("");
    inputRef.current?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const p = results[active];
      if (p) add(p);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    }
  };

  return (
    <div ref={boxRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={full}
        aria-expanded={open}
        aria-haspopup="listbox"
        title={full ? "파티가 가득 찼습니다" : "포켓몬을 직접 골라 추가"}
        className="rounded-lg border border-accent-600 px-4 py-2 font-semibold text-accent-700 transition-colors hover:bg-accent-50 disabled:cursor-not-allowed disabled:border-gray-300 disabled:text-gray-400 dark:text-accent-300 dark:hover:bg-accent-950 dark:disabled:border-gray-700 dark:disabled:text-gray-600"
      >
        직접 추가
      </button>

      {open && (
        <div className="absolute left-0 top-full z-20 mt-2 w-80 rounded-lg border border-gray-200 bg-white p-2 shadow-lg dark:border-gray-600 dark:bg-gray-800">
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-expanded="true"
            aria-controls="direct-add-list"
            aria-autocomplete="list"
            aria-activedescendant={
              results[active] ? `direct-add-opt-${results[active].id}` : undefined
            }
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="이름 또는 도감번호"
            aria-label="추가할 포켓몬 검색"
            className="w-full rounded-md border border-gray-200 bg-gray-50 px-2 py-2 text-base dark:border-gray-600 dark:bg-gray-900/40"
          />

          <ul
            ref={listRef}
            id="direct-add-list"
            role="listbox"
            aria-label="검색 결과"
            className="mt-2 max-h-64 overflow-y-auto"
          >
            {results.length === 0 && (
              <li className="px-2 py-6 text-center text-sm text-gray-400">
                검색 결과가 없습니다
              </li>
            )}
            {results.map((p, i) => {
              const already = inParty.has(p.id);
              return (
                <li
                  key={p.id}
                  id={`direct-add-opt-${p.id}`}
                  data-idx={i}
                  role="option"
                  aria-selected={i === active}
                  aria-disabled={already}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => add(p)}
                  className={`flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm ${
                    i === active ? "bg-accent-50 dark:bg-gray-700" : ""
                  } ${already ? "cursor-not-allowed opacity-50" : ""}`}
                >
                  <span className="w-9 shrink-0 font-mono text-xs text-gray-400">
                    {dexNo(p.id)}
                  </span>
                  <span className="truncate font-medium">{nameOf(p, lang)}</span>
                  <span className="ml-auto flex shrink-0 gap-1">
                    {already ? (
                      <span className="text-xs text-gray-500">이미 있음</span>
                    ) : (
                      p.types.map((t) => (
                        <span
                          key={t}
                          className={`rounded-full px-1.5 py-0.5 text-xs font-semibold ${TYPE_COLOR[t]}`}
                        >
                          {typeName(t, lang)}
                        </span>
                      ))
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
