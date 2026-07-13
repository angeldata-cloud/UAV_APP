export const getLocalDateKey = (date = new Date()): string => {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
};
export const isToday = (iso: string | null): boolean => Boolean(iso && getLocalDateKey(new Date(iso)) === getLocalDateKey());
export const addMilliseconds = (ms: number, date = new Date()): string => new Date(date.getTime() + ms).toISOString();
export const formatRelativeTime = (iso: string | null): string => {
  if (!iso) return '尚未安排'; const diff = new Date(iso).getTime() - Date.now();
  if (Math.abs(diff) < 60_000) return diff <= 0 ? '現在可複習' : '1 分鐘後';
  const n = Math.round(Math.abs(diff) / (diff < 3_600_000 ? 60_000 : diff < 86_400_000 ? 3_600_000 : 86_400_000));
  const unit = Math.abs(diff) < 3_600_000 ? '分鐘' : Math.abs(diff) < 86_400_000 ? '小時' : '天';
  return diff <= 0 ? `${n} ${unit}前` : `${n} ${unit}後`;
};
export const formatDateTime = (iso: string | null): string => iso ? new Intl.DateTimeFormat('zh-TW', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso)) : '尚無紀錄';
