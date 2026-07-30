// 사용 설명서 팝업. 첫 방문에만 자동으로 뜨고, 이후엔 헤더의 '사용법' 버튼으로 연다.
//
// 네이티브 <dialog>.showModal() 을 쓴다 — 포커스 트랩 · Esc 닫기 · inert 처리를
// 브라우저가 해주므로 직접 구현하지 않는다.
import { useEffect, useRef } from "react";

const STORAGE_KEY = "rp:guide-seen";

// 첫 방문 판정. localStorage 접근이 막힌 환경(사생활 보호 모드 등)에서는
// 예외가 나므로, 그때는 '이미 봤다'로 처리해 팝업이 매번 뜨는 것을 막는다.
export function hasSeenGuide(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return true;
  }
}

export function markGuideSeen() {
  try {
    window.localStorage.setItem(STORAGE_KEY, "1");
  } catch {
    // 저장 실패는 무시 (다음 방문에 한 번 더 뜰 뿐)
  }
}

export function GuideDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  // Esc·백드롭 등 브라우저가 직접 닫는 경로도 상태에 반영
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.addEventListener("close", onClose);
    return () => el.removeEventListener("close", onClose);
  }, [onClose]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="guide-title"
      // 브라우저 기본 위치/여백을 걷어내고 화면 중앙에 직접 배치
      className="m-auto w-[min(34rem,calc(100vw-2rem))] rounded-xl border border-gray-200 bg-white p-0 text-gray-900 shadow-xl backdrop:bg-black/40 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
      onClick={(e) => {
        // 백드롭(= dialog 자기 자신) 클릭으로 닫기
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="max-h-[80vh] overflow-y-auto p-5">
        <h2 id="guide-title" className="mb-4 text-xl font-bold">
          사용법
        </h2>

        <Section title="1. 조건을 고른다">
          왼쪽 <b>필터</b>에서 세대 · 타입 · 진화 단계 · 종족값 범위를 정합니다.
          조건에 맞는 포켓몬이 몇 마리인지 실시간으로 보여줍니다.
          <br />
          조건을 바꿔도 <b>이미 뽑은 결과는 그대로</b> 남습니다.
        </Section>

        <Section title="2. 뽑는다">
          <b>+ 추가</b>를 누르면 조건에 맞는 포켓몬이 한 마리씩 들어옵니다 (최대 6마리).
          마음에 안 드는 카드는 <b>🎲 리롤</b>로 그 카드만 다시 뽑고,
          <b> ✕ 삭제</b>로 그 카드만 뺍니다.
          <br />
          특정 포켓몬을 넣고 싶으면 <b>직접 추가</b>를 쓰세요. 이름 · 도감번호는 물론
          <b> 초성</b>으로도 찾습니다 (<code>ㅍㅋㅊ</code> → 피카츄).
        </Section>

        <Section title="3. 다른 모습으로 바꾼다">
          리전폼(알로라 · 가라르 · 히스이 · 팔데아)이나 로토무 · 데오키시스처럼
          모습이 여러 개인 포켓몬은 카드에 <b>모습 선택</b>이 생깁니다.
          고르면 도트 · 타입 · 종족값 · 특성이 그 모습 것으로 바뀝니다.
          <br />
          추첨은 도감 1025종 기준이라, 같은 포켓몬이 모습 때문에 여러 번 뽑히지 않습니다.
        </Section>

        <Section title="4. 스타팅을 정한다">
          카드 아래 <b>스타팅 선택</b>을 누르면 <b>스타팅</b> 탭으로 넘어갑니다.
          특성 · 개체값 · 성격을 <b>돌리기</b>로 하나씩 굴리거나 직접 지정하면
          레벨 50 기준 실능력치가 바로 계산됩니다.
        </Section>

        <Section title="알아두면 좋은 것">
          <ul className="list-disc space-y-1 pl-5">
            <li>필터 조건은 주소(URL)에 담깁니다. 링크를 복사해 그대로 공유하세요.</li>
            <li>포켓몬 이름을 클릭하면 포켓몬 위키의 출현장소로 이동합니다.</li>
            <li>표시 언어는 8개국어를 지원합니다 (표시 옵션).</li>
            <li>표시 옵션에서 도트 이미지 · 도감번호 · 타입 · 종족값을 끄고 켤 수 있습니다.</li>
            <li>돌리기 효과음은 스타팅 탭의 🔊 버튼으로 끌 수 있습니다.</li>
          </ul>
        </Section>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-accent-600 px-5 py-2 font-semibold text-white transition-colors hover:bg-accent-700"
          >
            시작하기
          </button>
        </div>

        <p className="mt-3 text-center text-xs text-gray-500 dark:text-gray-400">
          이 안내는 처음 한 번만 뜹니다. 나중에 <b>사용법</b> 버튼으로 다시 볼 수 있어요.
        </p>
      </div>
    </dialog>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-4">
      <h3 className="mb-1 border-l-4 border-accent-500 pl-2 font-semibold">
        {title}
      </h3>
      <div className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
        {children}
      </div>
    </section>
  );
}
