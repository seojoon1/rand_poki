// 리롤 효과음. 오디오 에셋 없이 Web Audio 로 합성한다
// (바이너리 파일 추가 없음 · 네트워크 요청 없음 · 스핀 틱마다 재생해도 가벼움).
//
// 브라우저 자동재생 정책상 AudioContext 는 사용자 제스처 안에서만 생성/재개할 수
// 있으므로, 최초 재생(= 돌리기 클릭) 시점에 지연 생성한다.

const STORAGE_KEY = "rp:sound";

let ctx: AudioContext | null = null;
let muted = false;
let loaded = false;

// localStorage 는 클라이언트에서만 (SSR 하이드레이션 불일치 방지).
function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  muted = window.localStorage.getItem(STORAGE_KEY) === "off";
}

export function isMuted(): boolean {
  load();
  return muted;
}

export function setMuted(next: boolean) {
  load();
  muted = next;
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, next ? "off" : "on");
  }
}

// 재생 가능한 컨텍스트를 확보. 음소거·비지원 환경이면 null.
function audio(): AudioContext | null {
  load();
  if (muted || typeof window === "undefined") return null;
  const Ctor = window.AudioContext ?? (window as any).webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) ctx = new Ctor();
  // 탭 복귀 등으로 suspended 상태면 재개 (클릭 핸들러 안이라 허용됨).
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

// 짧은 음 하나. attack 은 즉시, release 는 지수 감쇠(클릭 노이즈 방지).
function blip(
  freq: number,
  {
    type = "square",
    gain = 0.06,
    duration = 0.05,
    delay = 0,
    slideTo,
  }: {
    type?: OscillatorType;
    gain?: number;
    duration?: number;
    delay?: number;
    slideTo?: number;
  } = {}
) {
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime + delay;

  const osc = ac.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + duration);

  const amp = ac.createGain();
  amp.gain.setValueAtTime(gain, t);
  amp.gain.exponentialRampToValueAtTime(0.0001, t + duration);

  osc.connect(amp).connect(ac.destination);
  osc.start(t);
  osc.stop(t + duration);
}

// 슬롯이 한 칸 넘어갈 때의 딸깍. 매번 살짝 음정을 흔들어 기계적인 반복을 줄인다.
export function tick() {
  blip(820 + Math.random() * 220, { gain: 0.035, duration: 0.03 });
}

// 값이 확정될 때의 착지음 (짧게 위로 미끄러짐).
export function land() {
  blip(392, { type: "triangle", gain: 0.1, duration: 0.16, slideTo: 587 });
}

// 대박(개체값 31 · 숨김특성) 용 상승 아르페지오.
export function jackpot() {
  const notes = [659.25, 830.61, 987.77, 1318.51]; // E5 · G#5 · B5 · E6
  notes.forEach((f, i) =>
    blip(f, { type: "triangle", gain: 0.09, duration: 0.18, delay: i * 0.07 })
  );
}
