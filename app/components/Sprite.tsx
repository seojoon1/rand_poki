// 도트 스프라이트 이미지. 96x96 원본을 확대해 쓰므로 보간 없이(pixelated) 그린다.
// 크기는 고정 박스로 잡아 로딩 중에도 레이아웃이 밀리지 않게 한다.
import { spriteUrl } from "../lib/pokedex";

export function Sprite({
  id,
  name,
  size,
  className = "",
}: {
  id: number;
  // alt 텍스트 (현재 표시 언어의 이름)
  name: string;
  // 정사각 변 길이(px)
  size: number;
  className?: string;
}) {
  return (
    <img
      src={spriteUrl(id)}
      alt={name}
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      style={{ width: size, height: size, imageRendering: "pixelated" }}
      className={`shrink-0 object-contain ${className}`}
    />
  );
}
