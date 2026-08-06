export type UsInstitutionDirectoryEntry = readonly [
  unitId: number,
  name: string,
  state: string,
];

export type UsInstitutionSuggestion = {
  unitId: string;
  name: string;
  state: string;
};

let directoryPromise: Promise<readonly UsInstitutionDirectoryEntry[]> | null = null;

export function normalizeInstitutionQuery(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function searchUsInstitutions(
  entries: readonly UsInstitutionDirectoryEntry[],
  query: string,
  limit = 8
): UsInstitutionSuggestion[] {
  const normalizedQuery = normalizeInstitutionQuery(query).slice(0, 80);
  if (normalizedQuery.length < 2 || limit < 1) return [];
  const queryTokens = normalizedQuery.split(" ");
  const matches: Array<{ entry: UsInstitutionDirectoryEntry; score: number }> = [];

  for (const entry of entries) {
    const normalizedName = normalizeInstitutionQuery(entry[1]);
    if (!queryTokens.every((token) => normalizedName.includes(token))) continue;

    let score = 3;
    if (normalizedName === normalizedQuery) score = 0;
    else if (normalizedName.startsWith(normalizedQuery)) score = 1;
    else if (normalizedName.includes(` ${normalizedQuery}`)) score = 2;
    matches.push({ entry, score });
  }

  matches.sort((left, right) =>
    left.score - right.score
    || left.entry[1].length - right.entry[1].length
    || left.entry[1].localeCompare(right.entry[1])
  );

  return matches.slice(0, limit).map(({ entry }) => ({
    unitId: String(entry[0]),
    name: entry[1],
    state: entry[2],
  }));
}

export function loadUsInstitutionDirectory() {
  directoryPromise ??= import("@/data/us-institutions.min.json")
    .then((module) => module.default.institutions as unknown as UsInstitutionDirectoryEntry[]);
  return directoryPromise;
}
