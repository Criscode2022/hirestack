export function resourceRows<T>(
  resource: { hasValue(): boolean; value(): T | undefined },
): T extends readonly (infer Item)[] ? Item[] : T[] {
  if (!resource.hasValue()) return [] as never;
  const value = resource.value();
  return (Array.isArray(value) ? value : []) as never;
}

export function isNotFoundError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }
  const status = (error as { status?: number }).status;
  if (status === 404) {
    return true;
  }
  const nested = (error as { error?: { status?: number } }).error;
  return nested?.status === 404;
}

