const ignoredWords = new Set(["pokemon", "version"]);

const tags = (name: string) => [...name.matchAll(/\(([^)]*)\)|\[([^\]]*)\]/g)].map((tag) => tag[1] ?? tag[2]);

function words(name: string) {
  const plain = name
    .replace(/\([^)]*\)|\[[^\]]*\]/g, " ")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/['’]/g, "");
  return new Set(plain.split(/[^\p{L}\p{N}]+/u).filter((word) => word && !ignoredWords.has(word)));
}

function regionRank(name: string) {
  const regions = new Set(tags(name).flatMap((tag) => tag.split(",").map((region) => region.trim())));
  if (regions.has("World") || (regions.has("USA") && regions.has("Europe"))) return 0;
  if (regions.has("USA")) return 1;
  if (regions.has("Europe")) return 2;
  return 3;
}

type Candidate = { name: string; exact: boolean; matched: number; extra: number; region: number; tags: number };

const byName = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

const closeness = (a: Candidate, b: Candidate) =>
  b.matched - a.matched || a.extra - b.extra || a.region - b.region || a.tags - b.tags;

function candidates(name: string, listing: string[]) {
  const wanted = words(name);
  const found: Candidate[] = [];
  for (const candidate of listing) {
    const exact = candidate === name;
    const have = words(candidate);
    let matched = 0;
    for (const word of wanted) if (have.has(word)) matched++;
    if (!exact && !matched) continue;
    found.push({ name: candidate, exact, matched, extra: have.size - matched, region: regionRank(candidate), tags: tags(candidate).length });
  }
  found.sort((a, b) => Number(b.exact) - Number(a.exact) || closeness(a, b) || byName.compare(a.name, b.name));
  return { wanted, found };
}

export function rankBoxArt(name: string, listing: string[]) {
  return candidates(name, listing).found.map((candidate) => candidate.name);
}

export function matchBoxArt(name: string, listing: string[]) {
  const { wanted, found } = candidates(name, listing);
  const [best, next] = found;
  if (best?.exact) return best.name;
  if (!best || !wanted.size || best.matched < wanted.size) return undefined;
  if (next && !closeness(best, next)) return undefined;
  return best.name;
}

export function parseListing(html: string) {
  return [...html.matchAll(/href="([^"/?]+)\.png"/g)].map((link) => decodeURIComponent(link[1]));
}
