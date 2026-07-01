export default function GoogleGmailBadge({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path fill="#4caf50" d="M45 16.18L45 38C45 39.66 43.66 41 42 41L6 41C4.34 41 3 39.66 3 38L3 16.18L24 29.77L45 16.18Z" />
      <path fill="#1e88e5" d="M3 10.82L3 16.18L24 29.77L45 16.18L45 10.82C45 9.16 43.66 7.82 42 7.82L6 7.82C4.34 7.82 3 9.16 3 10.82Z" />
      <path fill="#e53935" d="M3 10.82L24 24.41L45 10.82C45 9.16 43.66 7.82 42 7.82L6 7.82C4.34 7.82 3 9.16 3 10.82Z" />
      <path fill="#fbc02d" d="M24 24.41L3 10.82L3 16.18L24 29.77L45 16.18L45 10.82L24 24.41Z" opacity="0.9" />
    </svg>
  );
}
