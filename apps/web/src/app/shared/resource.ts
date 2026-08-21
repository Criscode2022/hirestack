export function resourceRows<T>(
  resource: { hasValue(): boolean; value(): T | undefined },
): T extends readonly (infer Item)[] ? Item[] : T[] {
  if (!resource.hasValue()) return [] as never;
  const value = resource.value();
  return (Array.isArray(value) ? value : []) as never;
}
