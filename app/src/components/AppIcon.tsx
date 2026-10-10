export function AppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" aria-hidden className={className}>
      <rect width="100" height="100" rx="23" fill="#6d4aff" />
      <rect x="29" y="31" width="13" height="38" rx="3" fill="#ffffff" />
      <rect x="16.5" y="43.5" width="38" height="13" rx="3" fill="#ffffff" />
      <circle cx="68" cy="59" r="7.5" fill="#ffffff" />
      <circle cx="81" cy="42" r="7.5" fill="#ffffff" />
    </svg>
  );
}
