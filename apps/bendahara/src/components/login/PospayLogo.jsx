/** Logo POSPAY — kotak putih rounded + ikon topi wisuda & tas uang (brand #0056D2) */
const BRAND_BLUE = '#0056D2';

export default function PospayLogo({ size = 44, className = '' }) {
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-xl bg-white shadow-sm ${className}`}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <svg
        width={size * 0.62}
        height={size * 0.62}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M5 13 L16 7.5 L27 13 L16 18.5 Z" fill={BRAND_BLUE} />
        <rect x="23" y="11.5" width="5.5" height="2.2" rx="0.6" fill={BRAND_BLUE} />
        <path
          d="M9 17.5 H23 C24.38 17.5 25.5 18.62 25.5 20 V26.5 C25.5 27.88 24.38 29 23 29 H9 C7.62 29 6.5 27.88 6.5 26.5 V20 C6.5 18.62 7.62 17.5 9 17.5 Z"
          fill={BRAND_BLUE}
        />
        <path
          d="M11 17.5 V15 C11 13.07 12.57 11.5 14.5 11.5 H17.5 C19.43 11.5 21 13.07 21 15 V17.5"
          stroke={BRAND_BLUE}
          strokeWidth="1.6"
          fill="none"
        />
        <path
          d="M27.5 19.5 V26 M24.5 23 L27.5 26 L30.5 23"
          stroke={BRAND_BLUE}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
