import { describe, it, expect } from "vitest";
import { filterPool, countPool, drawRandom } from "./filter";
import type { Pokemon, PokemonType, Stage, FilterOptions } from "./filter";

// ── 테스트용 포켓몬 생성 헬퍼 ─────────────────────────────────────────
// 필요한 필드만 넘기고 나머지는 기본값으로 채운다.
function mk(
  id: number,
  overrides: Partial<Pokemon> & { types: PokemonType[] }
): Pokemon {
  const total = overrides.stats?.total ?? 500;
  return {
    id,
    slug: overrides.slug ?? `p${id}`,
    names: overrides.names ?? { en: `p${id}` },
    types: overrides.types,
    gen: overrides.gen ?? 1,
    chainId: overrides.chainId ?? id, // 기본은 각자 다른 체인
    stage: overrides.stage ?? ["base", "final"],
    isLegendary: overrides.isLegendary ?? false,
    isMythical: overrides.isMythical ?? false,
    requiresTrade: overrides.requiresTrade ?? false,
    // 기본은 모든 게임에서 입수 가능 (게임 조건 테스트에서만 덮어쓴다)
    vg: overrides.vg ?? ~0,
    stats: overrides.stats ?? {
      hp: 0,
      atk: 0,
      def: 0,
      spa: 0,
      spd: 0,
      spe: 0,
      total,
    },
    abilities: overrides.abilities ?? [],
    forms: overrides.forms ?? [],
  };
}

// 모든 세대/단계를 허용하는 기본 옵션 (개별 테스트에서 덮어씀)
function baseOpts(over: Partial<FilterOptions> = {}): FilterOptions {
  return {
    gens: new Set([1, 2, 3, 4, 5, 6, 7, 8, 9]),
    types: new Set<PokemonType>(),
    typeMode: "any",
    dualOnly: false,
    stages: new Set<Stage>(["base", "middle", "final"]),
    ...over,
  };
}

// 시드 고정 RNG (선형 합동 생성기) — 재현성 테스트용
function seededRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

// ── 타입 매칭 3종 시나리오 (S = {fire, water}) ───────────────────────
describe("타입 매칭", () => {
  const squirtle = mk(7, { types: ["water"], slug: "squirtle" });
  const charizard = mk(6, { types: ["fire", "flying"], slug: "charizard" });
  const volcanion = mk(721, { types: ["water", "fire"], slug: "volcanion" });
  const pool = [squirtle, charizard, volcanion];
  const S = new Set<PokemonType>(["fire", "water"]);

  it("any: 하나라도 S에 속하면 통과", () => {
    const res = filterPool(pool, baseOpts({ types: S, typeMode: "any" }));
    expect(res.map((p) => p.slug).sort()).toEqual(
      ["charizard", "squirtle", "volcanion"].sort()
    );
  });

  it("exact: 모든 타입이 S에 속해야 통과 (리자몽 탈락)", () => {
    const res = filterPool(pool, baseOpts({ types: S, typeMode: "exact" }));
    expect(res.map((p) => p.slug).sort()).toEqual(
      ["squirtle", "volcanion"].sort()
    );
  });

  it("any + dualOnly: 꼬부기 탈락", () => {
    const res = filterPool(
      pool,
      baseOpts({ types: S, typeMode: "any", dualOnly: true })
    );
    // 꼬부기는 단일타입이라 탈락, 리자몽/볼케니온은 2타입
    expect(res.map((p) => p.slug).sort()).toEqual(
      ["charizard", "volcanion"].sort()
    );
  });

  it("exact + dualOnly: 볼케니온만 남음", () => {
    const res = filterPool(
      pool,
      baseOpts({ types: S, typeMode: "exact", dualOnly: true })
    );
    expect(res.map((p) => p.slug)).toEqual(["volcanion"]);
  });
});

// ── 경계: 빈 집합 ────────────────────────────────────────────────────
describe("빈 집합 처리", () => {
  const pool = [mk(1, { types: ["fire"] })];

  it("types 빈 집합이면 빈 배열 (에러 없음)", () => {
    const opts = baseOpts({ types: new Set() });
    expect(filterPool(pool, opts)).toEqual([]);
    expect(countPool(pool, opts)).toBe(0);
  });

  it("gens 빈 집합이면 빈 배열 (에러 없음)", () => {
    const opts = baseOpts({ types: new Set(["fire"]), gens: new Set() });
    expect(filterPool(pool, opts)).toEqual([]);
    expect(countPool(pool, opts)).toBe(0);
  });
});

// ── 단일 진화 종의 stage 매칭 (["base","final"]) ────────────────────
describe("stage 매칭", () => {
  const ditto = mk(132, { types: ["normal"], stage: ["base", "final"] });
  const pool = [ditto];

  it("base 만 켜도 단일 진화 종이 나온다", () => {
    const res = filterPool(pool, baseOpts({ types: new Set(["normal"]), stages: new Set(["base"]) }));
    expect(res).toHaveLength(1);
  });

  it("final 만 켜도 단일 진화 종이 나온다", () => {
    const res = filterPool(pool, baseOpts({ types: new Set(["normal"]), stages: new Set(["final"]) }));
    expect(res).toHaveLength(1);
  });

  it("middle 만 켜면 안 나온다", () => {
    const res = filterPool(pool, baseOpts({ types: new Set(["normal"]), stages: new Set(["middle"]) }));
    expect(res).toHaveLength(0);
  });
});

// ── statTotal 경계값 (이상/이하) ─────────────────────────────────────
describe("statTotal 경계", () => {
  const low = mk(1, { types: ["fire"], stats: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0, total: 300 } });
  const mid = mk(2, { types: ["fire"], stats: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0, total: 500 } });
  const high = mk(3, { types: ["fire"], stats: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0, total: 700 } });
  const pool = [low, mid, high];

  it("범위 경계값은 포함 (min<=total<=max)", () => {
    const res = filterPool(
      pool,
      baseOpts({ types: new Set(["fire"]), statTotal: [300, 500] })
    );
    // 300, 500 은 경계 포함, 700 은 제외
    expect(res.map((p) => p.id).sort()).toEqual([1, 2]);
  });

  it("범위 밖은 제외", () => {
    const res = filterPool(
      pool,
      baseOpts({ types: new Set(["fire"]), statTotal: [501, 699] })
    );
    expect(res).toHaveLength(0);
  });
});

// ── excludeLegendary ─────────────────────────────────────────────────
describe("전설/환상 제외", () => {
  const normal = mk(1, { types: ["fire"] });
  const legend = mk(2, { types: ["fire"], isLegendary: true });
  const mythic = mk(3, { types: ["fire"], isMythical: true });
  const pool = [normal, legend, mythic];

  it("excludeLegendary 이면 전설/환상 모두 제외", () => {
    const res = filterPool(
      pool,
      baseOpts({ types: new Set(["fire"]), excludeLegendary: true })
    );
    expect(res.map((p) => p.id)).toEqual([1]);
  });
});

// ── drawRandom: clamp ────────────────────────────────────────────────
describe("drawRandom clamp", () => {
  const pool = Array.from({ length: 20 }, (_, i) =>
    mk(i + 1, { types: ["normal"] })
  );

  it("count 0 은 1 로 clamp", () => {
    expect(drawRandom(pool, 0, { rng: seededRng(1) })).toHaveLength(1);
  });

  it("count 7 은 6 으로 clamp", () => {
    expect(drawRandom(pool, 7, { rng: seededRng(1) })).toHaveLength(6);
  });

  it("count > pool.length 여도 에러 없이 있는 만큼만", () => {
    const small = pool.slice(0, 3);
    expect(drawRandom(small, 6, { rng: seededRng(1) })).toHaveLength(3);
  });

  it("원본 배열을 변경하지 않는다", () => {
    const snapshot = pool.map((p) => p.id);
    drawRandom(pool, 6, { rng: seededRng(42) });
    expect(pool.map((p) => p.id)).toEqual(snapshot);
  });
});

// ── drawRandom: uniqueChain ──────────────────────────────────────────
describe("drawRandom uniqueChain", () => {
  it("같은 체인만 있는 풀에서 6마리 요청 시 1마리만", () => {
    // chainId 가 전부 같은 진화 계열 (파이리/리자드/리자몽 등)
    const pool = [
      mk(4, { types: ["fire"], chainId: 2 }),
      mk(5, { types: ["fire"], chainId: 2 }),
      mk(6, { types: ["fire", "flying"], chainId: 2 }),
    ];
    const res = drawRandom(pool, 6, { uniqueChain: true, rng: seededRng(3) });
    expect(res).toHaveLength(1);
  });

  it("uniqueChain 없으면 같은 체인도 전부 뽑힘", () => {
    const pool = [
      mk(4, { types: ["fire"], chainId: 2 }),
      mk(5, { types: ["fire"], chainId: 2 }),
      mk(6, { types: ["fire", "flying"], chainId: 2 }),
    ];
    const res = drawRandom(pool, 6, { rng: seededRng(3) });
    expect(res).toHaveLength(3);
  });
});

// ── drawRandom: 시드 고정 재현성 ─────────────────────────────────────
describe("drawRandom 재현성", () => {
  const pool = Array.from({ length: 30 }, (_, i) =>
    mk(i + 1, { types: ["normal"] })
  );

  it("같은 시드는 같은 결과", () => {
    const a = drawRandom(pool, 6, { rng: seededRng(12345) }).map((p) => p.id);
    const b = drawRandom(pool, 6, { rng: seededRng(12345) }).map((p) => p.id);
    expect(a).toEqual(b);
  });

  it("다른 시드는 (대개) 다른 결과", () => {
    const a = drawRandom(pool, 6, { rng: seededRng(1) }).map((p) => p.id);
    const b = drawRandom(pool, 6, { rng: seededRng(999) }).map((p) => p.id);
    expect(a).not.toEqual(b);
  });

  it("중복 없이 추출", () => {
    const res = drawRandom(pool, 6, { rng: seededRng(7) }).map((p) => p.id);
    expect(new Set(res).size).toBe(res.length);
  });
});

// ── countPool 이 filterPool.length 와 일치 ───────────────────────────
describe("countPool == filterPool.length", () => {
  const pool = [
    mk(1, { types: ["fire"], gen: 1, stats: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0, total: 400 } }),
    mk(2, { types: ["water"], gen: 2, stats: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0, total: 600 } }),
    mk(3, { types: ["fire", "flying"], gen: 1, stats: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0, total: 500 } }),
  ];

  it("여러 조건에서 두 함수 결과가 일치", () => {
    const opts = baseOpts({
      types: new Set(["fire"]),
      typeMode: "any",
      statTotal: [350, 550],
    });
    expect(countPool(pool, opts)).toBe(filterPool(pool, opts).length);
  });
});

// ── 게임(버전 그룹) 조건 ─────────────────────────────────────────────
// vg 는 비트마스크다. 여기서는 비트 0 = 게임A, 비트 1 = 게임B, 비트 2 = 게임C 로 둔다.
const GAME_A = 1 << 0;
const GAME_B = 1 << 1;
const GAME_C = 1 << 2;

describe("게임 조건 (gameMask)", () => {
  const pool = [
    mk(1, { types: ["fire"], vg: GAME_A }), // A 에만
    mk(2, { types: ["fire"], vg: GAME_B }), // B 에만
    mk(3, { types: ["fire"], vg: GAME_A | GAME_B }), // A·B 둘 다
    mk(4, { types: ["fire"], vg: 0 }), // 어느 게임에도 없음
  ];
  const opts = (over: Partial<FilterOptions> = {}) =>
    baseOpts({ types: new Set<PokemonType>(["fire"]), ...over });

  it("gameMask 가 undefined 면 조건 없음 — 전부 통과", () => {
    const ids = filterPool(pool, opts()).map((p) => p.id);
    expect(ids).toEqual([1, 2, 3, 4]);
  });

  it("한 게임만 고르면 그 게임에 나오는 종만 통과", () => {
    const ids = filterPool(pool, opts({ gameMask: GAME_A })).map((p) => p.id);
    expect(ids).toEqual([1, 3]);
  });

  it("여러 게임은 합집합 — 하나에서라도 얻을 수 있으면 통과", () => {
    const ids = filterPool(pool, opts({ gameMask: GAME_A | GAME_B })).map(
      (p) => p.id
    );
    expect(ids).toEqual([1, 2, 3]);
  });

  it("어느 게임에도 없는 종은 게임을 고르는 순간 빠진다", () => {
    const ids = filterPool(pool, opts({ gameMask: GAME_C })).map((p) => p.id);
    expect(ids).toEqual([]);
  });

  it("게임을 하나도 안 고르면(0) 빈 결과", () => {
    expect(filterPool(pool, opts({ gameMask: 0 }))).toEqual([]);
    expect(countPool(pool, opts({ gameMask: 0 }))).toBe(0);
  });

  it("countPool 이 filterPool.length 와 일치", () => {
    const o = opts({ gameMask: GAME_A | GAME_C });
    expect(countPool(pool, o)).toBe(filterPool(pool, o).length);
  });

  it("다른 조건과 AND 로 결합된다", () => {
    const mixed = [
      mk(10, { types: ["fire"], gen: 1, vg: GAME_A }),
      mk(11, { types: ["water"], gen: 1, vg: GAME_A }),
      mk(12, { types: ["fire"], gen: 2, vg: GAME_A }),
    ];
    const ids = filterPool(
      mixed,
      baseOpts({
        types: new Set<PokemonType>(["fire"]),
        gens: new Set([1]),
        gameMask: GAME_A,
      })
    ).map((p) => p.id);
    expect(ids).toEqual([10]);
  });
});
