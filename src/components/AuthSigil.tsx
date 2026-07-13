// The gold eight-pointed sigil used as the brand mark on the sign-in / sign-up screens.
// Self-contained SVG so the auth pages need no external image asset and stay on-palette.
export default function AuthSigil({ size = 58 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      style={{ display: 'block', margin: '0 auto', filter: 'drop-shadow(0 0 10px rgba(211,188,142,.5))' }}
    >
      <defs>
        <linearGradient id="auth-sigil-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f0dcac" />
          <stop offset="1" stopColor="#a4854c" />
        </linearGradient>
      </defs>
      <path d="M20 2 L24 16 L38 20 L24 24 L20 38 L16 24 L2 20 L16 16 Z" fill="url(#auth-sigil-grad)" />
      <path d="M20 9 L22 18 L31 20 L22 22 L20 31 L18 22 L9 20 L18 18 Z" fill="#12182a" opacity=".55" />
    </svg>
  )
}
