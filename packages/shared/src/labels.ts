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
