import { describe, expect, it } from "vitest";
import {
  chosungOf,
  isChosungJamo,
  hasChosung,
  chosungIncludes,
} from "./hangul";

describe("chosungOf", () => {
  it("음절에서 초성을 뽑는다", () => {
    expect(chosungOf("피")).toBe("ㅍ");
    expect(chosungOf("카")).toBe("ㅋ");
    expect(chosungOf("츄")).toBe("ㅊ");
  });

  it("종성 유무와 무관하게 같은 초성", () => {
    expect(chosungOf("가")).toBe("ㄱ");
    expect(chosungOf("갛")).toBe("ㄱ");
  });

  it("음절 영역 경계", () => {
    expect(chosungOf("가")).toBe("ㄱ"); // U+AC00
    expect(chosungOf("힣")).toBe("ㅎ"); // U+D7A3
  });

  it("한글 음절이 아니면 null", () => {
    expect(chosungOf("a")).toBeNull();
    expect(chosungOf("1")).toBeNull();
    expect(chosungOf("ㅍ")).toBeNull(); // 낱자는 음절이 아니다
    expect(chosungOf("あ")).toBeNull();
  });
});

describe("isChosungJamo / hasChosung", () => {
  it("초성이 될 수 있는 자음만 참", () => {
    expect(isChosungJamo("ㄱ")).toBe(true);
    expect(isChosungJamo("ㄲ")).toBe(true);
    expect(isChosungJamo("ㅏ")).toBe(false); // 모음
    expect(isChosungJamo("ㄳ")).toBe(false); // 겹받침 전용
    expect(isChosungJamo("피")).toBe(false);
  });

  it("검색어에 낱자 자음이 섞였는지 판단", () => {
    expect(hasChosung("ㅍㅋㅊ")).toBe(true);
    expect(hasChosung("피카ㅊ")).toBe(true);
    expect(hasChosung("피카츄")).toBe(false);
    expect(hasChosung("pikachu")).toBe(false);
  });
});

describe("chosungIncludes", () => {
  it("초성만으로 찾는다", () => {
    expect(chosungIncludes("피카츄", "ㅍㅋㅊ")).toBe(true);
    expect(chosungIncludes("파이리", "ㅍㅇㄹ")).toBe(true);
    expect(chosungIncludes("피카츄", "ㅍㅋㅅ")).toBe(false);
  });

  it("접두사가 아니어도 부분 일치", () => {
    expect(chosungIncludes("이상해씨", "ㅅㅎ")).toBe(true);
    expect(chosungIncludes("이상해씨", "ㅎㅆ")).toBe(true);
  });

  it("타이핑 중간 상태처럼 음절과 낱자가 섞여도 잡는다", () => {
    expect(chosungIncludes("피카츄", "피ㅋ")).toBe(true);
    expect(chosungIncludes("피카츄", "피카ㅊ")).toBe(true);
    expect(chosungIncludes("피카츄", "피ㅅ")).toBe(false);
  });

  it("낱자 자음은 음절의 초성하고만 맞는다 (같은 낱자끼리는 그대로 비교)", () => {
    expect(chosungIncludes("ㅍ", "ㅍ")).toBe(true);
    expect(chosungIncludes("피", "피")).toBe(true);
  });

  it("검색어가 대상보다 길면 거짓", () => {
    expect(chosungIncludes("피", "ㅍㅋㅊ")).toBe(false);
  });

  it("빈 검색어는 항상 참, 공백은 무시", () => {
    expect(chosungIncludes("피카츄", "")).toBe(true);
    expect(chosungIncludes("피카츄", "ㅍ ㅋ")).toBe(true);
  });

  it("한글이 아닌 대상에는 걸리지 않는다", () => {
    expect(chosungIncludes("Pikachu", "ㅍㅋㅊ")).toBe(false);
  });
});
