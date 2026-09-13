export function humanizeLabel(value: string | null | undefined): string {
  if (!value) {
    return '';
  }
  return value.toLowerCase().replaceAll('_', ' ');
}

export function titleLabel(value: string | null | undefined): string {
  const text = humanizeLabel(value);
  return text.replace(/\b\w/g, (char) => char.toUpperCase());
}

export function clipLabel(text: string | null | undefined, max = 88): string {
  const trimmed = (text ?? '').replace(/\s+/g, ' ').trim();
  if (trimmed.length <= max) {
    return trimmed;
  }
  const slice = trimmed.slice(0, max);
  const cut = slice.lastIndexOf(' ');
  const base = cut > Math.floor(max * 0.55) ? slice.slice(0, cut) : slice;
  return `${base.trim()}…`;
}

export function skillMatchPercent(have: Iterable<string>, needed: string[]): number | null {
  if (!needed.length) {
    return null;
  }
  const owned = new Set(have);
  const overlap = needed.filter((id) => owned.has(id)).length;
  return Math.round((overlap / needed.length) * 100);
}
