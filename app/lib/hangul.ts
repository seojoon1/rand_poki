// 한글 초성 검색 (순수 함수).
//
// ── 원리 ────────────────────────────────────────────────────────────
// 완성형 한글 음절(가~힣, U+AC00~U+D7A3)은 유니코드에 조합 순서대로 늘어서 있다.
//
//   code = 0xAC00 + (초성 × 21 + 중성) × 28 + 종성
//
// 중성 21개 · 종성 28개(없음 포함)이므로 한 초성이 21×28 = 588칸을 차지한다.
// 따라서 음절 하나의 초성 인덱스는 나눗셈 한 번으로 나온다.
//
//   초성 인덱스 = (code - 0xAC00) / 588   (버림)
//
// 예) '피' = U+D53C → (0xD53C - 0xAC00) / 588 = 17 → CHOSUNG[17] = 'ㅍ'
//
// 키보드로 자음만 친 'ㅍㅋㅊ'는 호환 자모(U+3131~U+314E) 영역의 낱글자다.
// 위 계산으로 얻은 초성과 이 낱글자를 직접 비교하면 된다.

// 초성 19자 — 유니코드 조합 순서 그대로여야 인덱스가 맞는다.
const CHOSUNG = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ";

const SYLLABLE_FIRST = 0xac00; // '가'
const SYLLABLE_LAST = 0xd7a3; // '힣'
const CHOSUNG_STRIDE = 588; // 중성 21 × 종성 28

// 완성형 음절이면 초성 낱글자를, 아니면 null.
export function chosungOf(ch: string): string | null {
  const code = ch.charCodeAt(0);
  if (code < SYLLABLE_FIRST || code > SYLLABLE_LAST) return null;
  return CHOSUNG[Math.floor((code - SYLLABLE_FIRST) / CHOSUNG_STRIDE)];
}

// 낱자로 친 자음인지 ('ㅍ' 등). 모음 낱자('ㅏ')는 초성이 될 수 없으므로 제외된다.
export function isChosungJamo(ch: string): boolean {
  return CHOSUNG.includes(ch);
}

// 검색어에 초성 낱자가 하나라도 있는지 — 초성 검색을 시도할 값어치가 있는지 판단.
export function hasChosung(q: string): boolean {
  for (const ch of q) if (isChosungJamo(ch)) return true;
  return false;
}

// text 안에 query 가 초성 기준으로 들어있는지.
//
// 검색어를 한 글자씩 대응시키되, 자모냐 아니냐로 규칙을 나눈다.
//   - 낱자 자음('ㅋ')  → 그 자리 음절의 초성과 같으면 통과.
//                        대상에도 같은 낱자가 있으면 그것도 통과시킨다
//                        (이름에 낱자가 그대로 들어있는 경우).
//   - 그 외('카', 'a') → 글자가 그대로 같아야 통과
// 이렇게 하면 타이핑 중간 상태인 '피카ㅊ' 같은 섞인 입력도 자연스럽게 잡힌다.
export function chosungIncludes(text: string, query: string): boolean {
  const q = query.replace(/\s+/g, "");
  if (!q) return true;
  if (q.length > text.length) return false;

  for (let start = 0; start + q.length <= text.length; start++) {
    let ok = true;
    for (let k = 0; k < q.length; k++) {
      const qc = q[k];
      const tc = text[start + k];
      if (isChosungJamo(qc)) {
        if (chosungOf(tc) !== qc && tc !== qc) {
          ok = false;
          break;
        }
      } else if (tc !== qc) {
        ok = false;
        break;
      }
    }
    if (ok) return true;
  }
  return false;
}
