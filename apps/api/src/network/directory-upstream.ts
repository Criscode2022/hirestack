import { isDirectoryProfile } from './directory-people';

export const DIRECTORY_SEED_QUERIES = [
  'Angular',
  'TypeScript',
  'NestJS',
  'Postgres',
  'React',
  'Austin',
  'Remote',
  'Staff',
];

type DirectoryPerson = {
  id: string;
  headline?: string | null;
  openToWork?: boolean;
  skills?: unknown[];
  [key: string]: unknown;
};

export async function fetchDirectoryPeople(
  fetchImpl: typeof fetch,
  baseUrl: string,
  q?: string,
): Promise<DirectoryPerson[]> {
  const needle = q?.trim();
  const queries = needle ? [needle] : DIRECTORY_SEED_QUERIES;
  const batches = await Promise.all(
    queries.map(async (query) => {
      const response = await fetchImpl(`${baseUrl}/api/people?q=${encodeURIComponent(query)}`);
      if (!response.ok) {
        return [] as DirectoryPerson[];
      }
      const json: unknown = await response.json();
      return Array.isArray(json) ? (json as DirectoryPerson[]) : [];
    }),
  );
  const byId = new Map<string, DirectoryPerson>();
  for (const row of batches.flat()) {
    if (row?.id) {
      byId.set(row.id, row);
    }
  }
  return [...byId.values()].filter(isDirectoryProfile);
}

export function rewriteSearchPeople<T extends { people?: unknown[] }>(payload: T): T {
  if (!Array.isArray(payload.people)) {
    return payload;
  }
  return {
    ...payload,
    people: payload.people.filter((row) => isDirectoryProfile(row as DirectoryPerson)),
  };
}
