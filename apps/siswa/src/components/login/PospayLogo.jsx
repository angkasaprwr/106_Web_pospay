export default function PospayLogo({ size = 44 }) {
  return (
    <div
      className="flex items-center justify-center rounded-xl bg-white shadow-sm"
      style={{ width: size, height: size }}
    >
      <svg width={size * 0.65} height={size * 0.65} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <rect x="4" y="14" width="20" height="12" rx="3" fill="#1a48a0" />
        <path d="M8 14 V11 C8 8.8 9.8 7 12 7 H20 C22.2 7 24 8.8 24 11 V14" stroke="#1a48a0" strokeWidth="2" />
        <circle cx="14" cy="20" r="2" fill="#fff" />
        <path d="M16 10 L20 7 L24 10 L20 13 Z" fill="#1a48a0" />
        <rect x="18" y="5" width="6" height="3" rx="1" fill="#60A5FA" />
      </svg>
    </div>
  );
}
