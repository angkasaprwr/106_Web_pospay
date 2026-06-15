/* Decorative login illustration & school crest (approximating the mockup). */

export function AuthIllustration({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 360 240" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="60" cy="60" r="46" fill="#ffffff" opacity="0.06" />
      <circle cx="300" cy="180" r="60" fill="#ffffff" opacity="0.05" />

      <rect x="36" y="196" width="84" height="12" rx="3" fill="#ffffff" opacity="0.85" />
      <rect x="44" y="184" width="76" height="12" rx="3" fill="#a7f3d0" />
      <rect x="40" y="172" width="70" height="12" rx="3" fill="#ffffff" opacity="0.7" />

      <rect x="96" y="96" width="170" height="104" rx="10" fill="#ffffff" />
      <rect x="108" y="108" width="146" height="80" rx="6" fill="#ecfdf5" />
      <rect x="84" y="200" width="194" height="12" rx="6" fill="#d1fae5" />
      <polyline points="120,170 142,150 162,158 184,128 206,138 230,112 244,120" fill="none" stroke="#059669" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="184" cy="128" r="4" fill="#047857" />
      <circle cx="230" cy="112" r="4" fill="#047857" />
      <rect x="118" y="120" width="8" height="16" rx="2" fill="#6ee7b7" />
      <rect x="130" y="116" width="8" height="20" rx="2" fill="#34d399" />
      <circle cx="226" cy="150" r="16" stroke="#a7f3d0" strokeWidth="6" fill="none" />
      <path d="M226 134 a16 16 0 0 1 14 24" stroke="#059669" strokeWidth="6" fill="none" strokeLinecap="round" />

      <g>
        <rect x="40" y="96" width="64" height="44" rx="12" fill="#ffffff" />
        <path d="M58 138 l-6 14 16 -10 z" fill="#ffffff" />
        <circle cx="60" cy="118" r="4" fill="#34d399" />
        <circle cx="74" cy="118" r="4" fill="#6ee7b7" />
        <circle cx="88" cy="118" r="4" fill="#a7f3d0" />
      </g>

      <g>
        <rect x="262" y="84" width="58" height="58" rx="12" fill="#047857" />
        <rect x="262" y="84" width="58" height="58" rx="12" fill="#ffffff" opacity="0.08" />
        <text x="291" y="120" textAnchor="middle" fill="#ffffff" fontSize="22" fontWeight="700" fontFamily="Inter, sans-serif">Rp</text>
      </g>

      <g>
        <rect x="286" y="196" width="34" height="20" rx="3" fill="#ffffff" opacity="0.85" />
        <path d="M303 196 c0 -16 -8 -22 -14 -26 c8 0 14 8 14 18" fill="#bbf7d0" opacity="0.9" />
        <path d="M303 196 c0 -18 8 -24 16 -28 c-6 4 -10 12 -10 22" fill="#86efac" opacity="0.9" />
      </g>
    </svg>
  );
}

export function SchoolCrest({ size = 56 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="32" r="30" fill="#fbbf24" />
      <circle cx="32" cy="32" r="30" stroke="#ffffff" strokeWidth="2" />
      <circle cx="32" cy="32" r="23" fill="#065f46" />
      <path d="M32 18l16 7-16 7-16-7 16-7z" fill="#ffffff" />
      <path d="M22 30v7c0 2 4.5 4 10 4s10-2 10-4v-7" stroke="#ffffff" strokeWidth="2.5" fill="none" />
      <path d="M48 25v9" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
