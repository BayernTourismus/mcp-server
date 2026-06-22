import { config } from "./config";

const HEADERS = { "User-Agent": "bayerncloud-mcp-server/2.0 (g@rnitz.de)" };

export async function geocode(
  address: string
): Promise<{ lat: number; lng: number; displayName: string } | null> {
  const url = `${config.NOMINATIM_URL}/search?format=json&q=${encodeURIComponent(address)}&limit=1`;
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`Nominatim ${res.status}`);
  const data = (await res.json()) as Array<{ lat: string; lon: string; display_name: string }>;
  if (!data.length) return null;
  return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), displayName: data[0].display_name };
}

export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const url = `${config.NOMINATIM_URL}/reverse?format=json&lat=${lat}&lon=${lng}`;
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`Nominatim ${res.status}`);
  const data = (await res.json()) as { display_name?: string };
  return data.display_name ?? "Address not found";
}

export async function routeDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): Promise<number | null> {
  const url = `${config.OSRM_URL}/route/v1/driving/${lng1},${lat1};${lng2},${lat2}?overview=false`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = (await res.json()) as { routes?: Array<{ distance: number }> };
  return data.routes?.[0]?.distance ?? null;
}

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
