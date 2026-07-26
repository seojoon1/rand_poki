// 개별 종족값 막대 하나. 접근성(role=meter) + 값 병기 + 진입 애니메이션.
import { useEffect, useState } from "react";

// 시각 스케일: 0~180 을 100% 로 매핑, 180 초과는 clamp 하고 끝에 표식.
const SCALE_MAX = 180;

// 값 구간별 색상 (무채색 2단계 + 강조색 emerald 2단계).
// 색만으로 구분하지 않도록 숫자를 항상 병기한다.
function barColor(value: number): string {
  if (value >= 120) return "bg-emerald-500"; // 매우높음
  if (value >= 90) return "bg-emerald-400"; // 높음
  if (value >= 60) return "bg-slate-400 dark:bg-slate-500"; // 보통
  return "bg-slate-300 dark:bg-slate-600"; // 낮음
}

export function StatBar({ label, value }: { label: string; value: number }) {
  const clamped = value > SCALE_MAX;
  const targetPct = Math.min(value, SCALE_MAX) / SCALE_MAX * 100;

  // 마운트 후 목표 폭으로 자라나게 (0 → target). reduced-motion 이면 CSS 로 즉시.
  const [grown, setGrown] = useState(false);
  useEffect(() => {
    // 다음 프레임에 목표 폭 지정 → width 트랜지션 발동
    const raf = requestAnimationFrame(() => setGrown(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-12 shrink-0 text-gray-500 dark:text-gray-400">
        {label}
      </span>
      <span className="w-9 shrink-0 text-right tabular-nums font-medium">
        {value}
      </span>
      <div
        className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700"
        role="meter"
        aria-label={label}
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={255}
      >
        <div
          className={`h-full rounded-full transition-[width] duration-300 ease-out motion-reduce:transition-none ${barColor(value)}`}
          style={{ width: grown ? `${targetPct}%` : "0%" }}
        />
        {/* clamp 표식: 180 초과 시 막대 끝에 빗금 표시 */}
        {clamped && (
          <div
            className="absolute inset-y-0 right-0 w-1.5 bg-emerald-700"
            title="180 초과 (스케일 최대)"
            aria-hidden="true"
          />
        )}
      </div>
    </div>
  );
}
