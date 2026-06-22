import { config } from "./config";

export interface BctGraph {
  "@id"?: string;
  "@type"?: string | string[];
  [key: string]: unknown;
}

export interface BctResponse {
  "@graph"?: BctGraph[];
  meta?: { total?: number; pages?: number };
  links?: { next?: string; prev?: string };
}

export interface BctBody {
  filter?: Record<string, unknown>;
  include?: string;
  fields?: string;
  page?: { size: number; number: number };
  sort?: string;
  section?: { meta: number };
  search?: string;
  [key: string]: unknown;
}

export async function bctPost(urlPath: string, body: BctBody = {}): Promise<BctResponse> {
  const res = await fetch(`${config.BCT_API_URL}${urlPath}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: config.BCT_API_TOKEN, ...body }),
  });
  if (!res.ok) {
    throw new Error(`BCT API ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  return res.json() as Promise<BctResponse>;
}

export async function bctGet(urlPath: string): Promise<BctResponse> {
  const url = new URL(`${config.BCT_API_URL}${urlPath}`);
  url.searchParams.set("token", config.BCT_API_TOKEN);
  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`BCT API ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  return res.json() as Promise<BctResponse>;
}

export function endpointPath(id: string): string {
  return `/endpoints/${id}`;
}

// Performance: skip expensive total-count DB query on subsequent pages
export function sectionFor(page: number): { meta: number } | undefined {
  return page > 1 ? { meta: 0 } : undefined;
}
