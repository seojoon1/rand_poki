import { describe, it, expect } from "vitest";
import {
  NATURES,
  getNature,
  rollIV,
  rollIVs,
  rollNature,
  rollAbility,
  rollStarter,
  emptyRoll,
  finalStats,
} from "./starter";
import type { AbilityRef, Stats } from "./filter";

// 시드 고정 RNG (선형 합동 생성기)
function seededRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

describe("성격(NATURES)", () => {
  it("25종이고 중립 성격은 5종", () => {
    expect(NATURES).toHaveLength(25);
    const neutral = NATURES.filter((n) => n.up === null && n.down === null);
    expect(neutral).toHaveLength(5);
  });

  it("보정 성격은 up/down 이 서로 다른 스탯", () => {
    for (const n of NATURES) {
      if (n.up === null) {
        expect(n.down).toBeNull();
      } else {
        expect(n.down).not.toBeNull();
        expect(n.up).not.toBe(n.down);
      }
    }
  });

  it("성격 키는 유일하다", () => {
    expect(new Set(NATURES.map((n) => n.key)).size).toBe(25);
  });

  it("getNature 로 조회", () => {
    expect(getNature("adamant")?.up).toBe("atk");
    expect(getNature("adamant")?.down).toBe("spa");
    expect(getNature("없는성격")).toBeUndefined();
  });
});

describe("개체값(IV)", () => {
  it("rollIV 는 0~31 정수", () => {
    const rng = seededRng(1);
    for (let i = 0; i < 500; i++) {
      const v = rollIV(rng);
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(31);
    }
  });

  it("경계값 0 과 31 도달 가능", () => {
    expect(rollIV(() => 0)).toBe(0); // 0*32 = 0
    expect(rollIV(() => 0.9999999)).toBe(31); // 31.99.. → 31
  });

  it("rollIVs 는 6스탯 모두 0~31", () => {
    const ivs = rollIVs(seededRng(7));
    for (const k of ["hp", "atk", "def", "spa", "spd", "spe"] as const) {
      expect(ivs[k]).toBeGreaterThanOrEqual(0);
      expect(ivs[k]).toBeLessThanOrEqual(31);
    }
  });

  it("같은 시드는 같은 개체값 (재현성)", () => {
    expect(rollIVs(seededRng(42))).toEqual(rollIVs(seededRng(42)));
  });
});

describe("성격/특성 롤", () => {
  it("rollNature 는 NATURES 안의 값", () => {
    const keys = new Set(NATURES.map((n) => n.key));
    for (let i = 0; i < 100; i++) {
      expect(keys.has(rollNature(seededRng(i)).key)).toBe(true);
    }
  });

  it("rollAbility 는 목록에서 하나 선택", () => {
    const abilities: AbilityRef[] = [
      { slug: "blaze", isHidden: false },
      { slug: "solar-power", isHidden: true },
    ];
    const picked = rollAbility(abilities, seededRng(3));
    expect(abilities).toContainEqual(picked);
  });

  it("특성 목록이 비면 null", () => {
    expect(rollAbility([], seededRng(1))).toBeNull();
  });

  it("숨김특성도 뽑힐 수 있다", () => {
    const abilities: AbilityRef[] = [
      { slug: "a", isHidden: false },
      { slug: "hidden", isHidden: true },
    ];
    // 하나의 rng 로 여러 번 뽑았을 때 숨김특성이 최소 한 번 나오는지
    const rng = seededRng(1);
    const seen = new Set<string>();
    for (let i = 0; i < 50; i++) {
      const p = rollAbility(abilities, rng);
      if (p) seen.add(p.slug);
    }
    expect(seen.has("hidden")).toBe(true);
  });
});

describe("emptyRoll", () => {
  it("개체값 0, 중립 성격, 특성 없음", () => {
    const r = emptyRoll();
    expect(r.ivs).toEqual({ hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 });
    expect(getNature(r.natureKey)?.up).toBeNull();
    expect(r.ability).toBeNull();
  });
});

describe("finalStats (레벨 50 실능력치)", () => {
  // 피츄 종족값
  const pichu: Stats = {
    hp: 20, atk: 40, def: 15, spa: 35, spd: 35, spe: 60, total: 205,
  };

  it("목업 케이스: 피츄 + 특정 IV/중립성격 = 80/50/34/53/51/65", () => {
    const ivs = { hp: 0, atk: 11, def: 29, spa: 27, spd: 23, spe: 0 };
    const fs = finalStats(pichu, ivs, "hardy");
    expect(fs.hp.total).toBe(80);
    expect(fs.atk.total).toBe(50);
    expect(fs.def.total).toBe(34);
    expect(fs.spa.total).toBe(53);
    expect(fs.spd.total).toBe(51);
    expect(fs.spe.total).toBe(65);
  });

  it("basePart + bonus = total (IV 0 이면 bonus 0)", () => {
    const fs = finalStats(pichu, { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }, "hardy");
    for (const k of ["hp", "atk", "def", "spa", "spd", "spe"] as const) {
      expect(fs[k].bonus).toBe(0);
      expect(fs[k].basePart).toBe(fs[k].total);
    }
  });

  it("성격 보정: 상승 스탯 ×1.1, 하락 스탯 ×0.9 (HP 제외)", () => {
    const ivs = { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 };
    const neutral = finalStats(pichu, ivs, "hardy");
    const adamant = finalStats(pichu, ivs, "adamant"); // atk↑ spa↓
    expect(adamant.atk.total).toBeGreaterThan(neutral.atk.total);
    expect(adamant.spa.total).toBeLessThan(neutral.spa.total);
    // HP 는 성격 영향 없음
    expect(adamant.hp.total).toBe(neutral.hp.total);
  });
});

describe("rollStarter 통합", () => {
  it("특성/성격/개체값을 모두 포함", () => {
    const roll = rollStarter(
      { abilities: [{ slug: "overgrow", isHidden: false }] },
      seededRng(99)
    );
    expect(roll.ability?.slug).toBe("overgrow");
    expect(getNature(roll.natureKey)).toBeDefined();
    expect(roll.ivs.hp).toBeGreaterThanOrEqual(0);
    expect(roll.ivs.hp).toBeLessThanOrEqual(31);
  });

  it("같은 시드는 같은 롤 결과", () => {
    const p = { abilities: [{ slug: "x", isHidden: false }] };
    expect(rollStarter(p, seededRng(5))).toEqual(rollStarter(p, seededRng(5)));
  });
});
