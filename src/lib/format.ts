function compact(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined && v !== null && v !== ""));
}

function formatAddress(address: Record<string, unknown> | undefined): string | undefined {
  if (!address) return undefined;
  const parts = [
    address["streetAddress"],
    [address["postalCode"], address["addressLocality"]].filter(Boolean).join(" "),
  ].filter(Boolean);
  return parts.join(", ") || undefined;
}

function firstOf<T>(val: T | T[] | undefined): T | undefined {
  if (Array.isArray(val)) return val[0];
  return val;
}

export function formatEvent(raw: BctGraph): Record<string, unknown> {
  const loc = firstOf(raw["location"] as BctGraph | BctGraph[] | undefined);
  const sched = firstOf(raw["eventSchedule"] as BctGraph | BctGraph[] | undefined);
  const geo = loc?.["geo"] as Record<string, unknown> | undefined;
  const addr = loc?.["address"] as Record<string, unknown> | undefined;

  return compact({
    id: raw["@id"],
    name: raw["name"],
    description: raw["description"],
    startDate: raw["startDate"] ?? (sched?.["startDate"] as string | undefined),
    endDate: raw["endDate"] ?? (sched?.["endDate"] as string | undefined),
    startTime: sched?.["startTime"],
    endTime: sched?.["endTime"],
    location: loc
      ? compact({
          name: loc["name"],
          address: formatAddress(addr),
          coordinates: geo
            ? { lat: geo["latitude"], lng: geo["longitude"] }
            : undefined,
        })
      : undefined,
  });
}

export function formatTour(raw: BctGraph): Record<string, unknown> {
  const startLoc = raw["odta:startLocation"] as Record<string, unknown> | undefined;
  const startGeo = startLoc?.["geo"] as Record<string, unknown> | undefined;
  const lengthM = raw["dc:length"] as number | undefined;

  return compact({
    id: raw["@id"],
    name: raw["name"],
    description: raw["description"],
    url: raw["url"],
    circular: raw["odta:circularTrail"],
    length_km: lengthM !== undefined ? Math.round((lengthM / 1000) * 10) / 10 : undefined,
    ascent_m: raw["dc:ascent"],
    descent_m: raw["dc:descent"],
    duration_min: raw["dc:duration"],
    altitude_min_m: raw["dc:minAltitude"],
    altitude_max_m: raw["dc:maxAltitude"],
    start_coordinates: startGeo
      ? { lat: startGeo["latitude"], lng: startGeo["longitude"], elevation_m: startGeo["elevation"] }
      : undefined,
  });
}

export function formatPoi(raw: BctGraph): Record<string, unknown> {
  const geo = raw["geo"] as Record<string, unknown> | undefined;
  const addr = raw["address"] as Record<string, unknown> | undefined;
  const types = raw["@type"];
  const typeStr = Array.isArray(types)
    ? types.filter((t) => !String(t).startsWith("dcls:")).join(", ")
    : types;

  return compact({
    id: raw["@id"],
    type: typeStr,
    name: raw["name"],
    description: raw["description"],
    address: formatAddress(addr),
    coordinates: geo ? { lat: geo["latitude"], lng: geo["longitude"] } : undefined,
    url: raw["url"],
  });
}

export function formatGastronomy(raw: BctGraph): Record<string, unknown> {
  const geo = raw["geo"] as Record<string, unknown> | undefined;
  const addr = raw["address"] as Record<string, unknown> | undefined;
  const types = raw["@type"];
  const typeStr = Array.isArray(types)
    ? types.filter((t) => !String(t).startsWith("dcls:")).join(", ")
    : types;

  return compact({
    id: raw["@id"],
    type: typeStr,
    name: raw["name"],
    description: raw["description"],
    address: formatAddress(addr),
    coordinates: geo ? { lat: geo["latitude"], lng: geo["longitude"] } : undefined,
    cuisine: raw["servesCuisine"],
    price_range: raw["priceRange"],
    opening_hours: raw["openingHoursSpecification"] ?? raw["openingHours"],
    telephone: raw["telephone"],
    url: raw["url"],
  });
}

export function formatClassificationTree(raw: BctGraph): Record<string, unknown> {
  return compact({
    id: raw["@id"],
    name: raw["skos:prefLabel"],
    conceptsUrl: raw["dc:hasConcept"],
  });
}

export function formatConcept(raw: BctGraph): Record<string, unknown> {
  const broader = raw["skos:broader"] as BctGraph | undefined;
  return compact({
    id: raw["@id"],
    name: raw["skos:prefLabel"],
    parentId: broader?.["@id"],
  });
}

export function formatItem(raw: BctGraph): Record<string, unknown> {
  const { "@context": _ctx, ...rest } = raw as Record<string, unknown>;
  return rest;
}

export function paginationNote(count: number, hasMore: boolean, page: number): string {
  return `Page ${page}: ${count} result(s).${hasMore ? ` More on page ${page + 1}.` : ""}`;
}

// Re-export the interface so tool files can use it
export interface BctGraph {
  "@id"?: string;
  "@type"?: string | string[];
  [key: string]: unknown;
}
