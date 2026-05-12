import type { ReactNode } from 'react'

type AvatarPreviewProps = {
  id: number
  size?: number
  className?: string
}

function SvgBox({
  size,
  className,
  children,
}: {
  size: number
  className?: string
  children: ReactNode
}) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      {children}
    </svg>
  )
}

export function AvatarArt({ id, size = 64, className }: AvatarPreviewProps) {
  const s = size
  switch (id) {
    case 0:
      return (
        <SvgBox size={s} className={className}>
          <circle cx="32" cy="34" r="22" fill="none" stroke="currentColor" strokeWidth="3" />
          <text
            x="32"
            y="40"
            textAnchor="middle"
            fontSize="20"
            fill="currentColor"
            fontFamily="Georgia, serif"
          >
            π
          </text>
        </SvgBox>
      )
    case 1:
      return (
        <SvgBox size={s} className={className}>
          <path
            d="M32 8 L56 44 Q32 58 8 44 Z"
            fill="#f4a64a"
            stroke="currentColor"
            strokeWidth="2"
          />
          <path
            d="M20 30 Q32 18 44 30"
            fill="none"
            stroke="#7a4a1e"
            strokeWidth="2"
            opacity="0.35"
          />
          <circle cx="32" cy="34" r="6" fill="#f8e7c4" opacity="0.9" />
        </SvgBox>
      )
    case 2:
      return (
        <SvgBox size={s} className={className}>
          <circle cx="32" cy="32" r="22" fill="none" stroke="currentColor" strokeWidth="3" />
          <line
            x1="10"
            y1="32"
            x2="54"
            y2="32"
            stroke="currentColor"
            strokeWidth="2"
            opacity="0.8"
          />
          <text x="34" y="27" fontSize="8" fill="currentColor" opacity="0.75">
            d
          </text>
        </SvgBox>
      )
    case 3:
      return (
        <SvgBox size={s} className={className}>
          <path
            d="M14 48 A22 22 0 0 1 48 14"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
          />
          <line x1="14" y1="48" x2="14" y2="32" stroke="currentColor" strokeWidth="2" />
          <line x1="48" y1="14" x2="32" y2="14" stroke="currentColor" strokeWidth="2" />
        </SvgBox>
      )
    case 4:
      return (
        <SvgBox size={s} className={className}>
          <rect x="10" y="12" width="44" height="40" rx="6" fill="none" stroke="currentColor" strokeWidth="2" />
          <text x="32" y="30" textAnchor="middle" fontSize="10" fill="currentColor">
            3·14
          </text>
          <text x="32" y="44" textAnchor="middle" fontSize="8" fill="currentColor" opacity="0.7">
            MAR
          </text>
        </SvgBox>
      )
    case 5:
      return (
        <SvgBox size={s} className={className}>
          <path
            d="M32 32 m0 0 Q 42 22 42 32 T 32 42 Q 22 52 22 32 T 32 22"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          />
          <path
            d="M32 32 C 44 20 48 36 32 48 C 16 36 20 20 32 32"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            opacity="0.8"
          />
        </SvgBox>
      )
    case 6:
      return (
        <SvgBox size={s} className={className}>
          <rect x="12" y="10" width="40" height="44" rx="4" fill="none" stroke="currentColor" strokeWidth="2" />
          <text x="18" y="26" fontSize="9" fill="currentColor" opacity="0.9">
            π = C/d
          </text>
          <line x1="16" y1="32" x2="48" y2="32" stroke="currentColor" strokeWidth="1" opacity="0.35" />
          <text x="18" y="46" fontSize="8" fill="currentColor" opacity="0.75">
            ∫
            e
            <tspan fontSize="6" baselineShift="super">
              −x²
            </tspan>
          </text>
        </SvgBox>
      )
    case 7:
      return (
        <SvgBox size={s} className={className}>
          <rect x="12" y="12" width="40" height="40" rx="6" fill="none" stroke="currentColor" strokeWidth="2.5" />
          <rect x="18" y="20" width="28" height="14" rx="2" fill="currentColor" opacity="0.15" />
          <circle cx="22" cy="42" r="2.5" fill="currentColor" />
          <circle cx="32" cy="42" r="2.5" fill="currentColor" />
          <circle cx="42" cy="42" r="2.5" fill="currentColor" />
          <text x="22" y="31" fontSize="8" fill="currentColor">
            3.14
          </text>
        </SvgBox>
      )
    case 8:
      return (
        <SvgBox size={s} className={className}>
          <circle cx="32" cy="30" r="18" fill="none" stroke="currentColor" strokeWidth="2" />
          <text x="32" y="35" textAnchor="middle" fontSize="14" fill="currentColor">
            π
          </text>
          <path d="M22 46 L32 54 L42 46" fill="none" stroke="currentColor" strokeWidth="2.5" />
        </SvgBox>
      )
    case 9:
      return (
        <SvgBox size={s} className={className}>
          <path
            d="M20 48 L24 18 L32 40 L40 18 L44 48 Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          <rect x="18" y="12" width="28" height="8" rx="2" fill="currentColor" opacity="0.25" />
          <text x="32" y="18.5" textAnchor="middle" fontSize="6" fill="currentColor">
            π DAY
          </text>
        </SvgBox>
      )
    default:
      return (
        <SvgBox size={s} className={className}>
          <text x="32" y="40" textAnchor="middle" fontSize="18" fill="currentColor">
            ?
          </text>
        </SvgBox>
      )
  }
}
