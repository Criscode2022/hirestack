export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60);
}

export function uniqueSlug(value: string): string {
  const base = slugify(value) || 'item';
  return `${base}-${Math.random().toString(36).slice(2, 6)}`;
}
