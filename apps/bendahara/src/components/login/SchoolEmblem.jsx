export default function SchoolEmblem({ size = 48 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <circle cx="24" cy="24" r="22" fill="#fff" fillOpacity="0.15" stroke="rgba(255,255,255,0.4)" strokeWidth="2" />
      <path d="M24 10 L34 16 V28 C34 32 29 35 24 36 C19 35 14 32 14 28 V16 Z" fill="#fff" fillOpacity="0.9" />
      <path d="M24 14 L30 18 V26 C30 28.5 27 30.5 24 31 C21 30.5 18 28.5 18 26 V18 Z" fill="#0047AB" fillOpacity="0.3" />
      <path d="M22 20 H26 V28 H22 Z" fill="#0047AB" />
      <path d="M20 18 H28 V20 H20 Z" fill="#0047AB" />
      <path d="M24 8 C24 8 22 12 20 14 C22 13 24 12 24 12 C24 12 26 13 28 14 C26 12 24 8 24 8Z" fill="#F97316" />
      <path d="M24 6 C24 6 23 9 22 10 C23 9.5 24 9 24 9 C24 9 25 9.5 26 10 C25 9 24 6 24 6Z" fill="#FB923C" />
    </svg>
  );
}
