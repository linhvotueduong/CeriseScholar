export function getLocalDay(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function isSameLocalDay(value: string | null | undefined, day = getLocalDay()) {
  if (!value) return false;
  return getLocalDay(new Date(value)) === day;
}
