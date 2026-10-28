/**
 * Format an ISO timestamp the way the notifications UI expects:
 * under a day -> "12 min ago" / "2h ago"; older -> "Mon, 4:12 PM".
 */
export function formatRelativeTime(iso: string | null | undefined): string {
  if (!iso) return '';

  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';

  const diffMs = Date.now() - then;
  const minutes = Math.floor(diffMs / 60000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  return new Date(then).toLocaleString('en-NG', {
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * True when the timestamp falls on the same calendar day as now.
 */
export function isToday(iso: string | null | undefined): boolean {
  if (!iso) return false;

  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return false;

  const now = new Date();
  return (
    then.getFullYear() === now.getFullYear() &&
    then.getMonth() === now.getMonth() &&
    then.getDate() === now.getDate()
  );
}
