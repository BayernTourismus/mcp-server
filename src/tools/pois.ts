import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { bctPost, endpointPath, sectionFor } from "../lib/bct";
import { config } from "../lib/config";
import { formatPoi, paginationNote, BctGraph } from "../lib/format";

const FIELDS = "name,description,address,geo,url";

export function registerPoisTools(server: McpServer): void {
  server.tool(
    "search_pois",
    "Search for Points of Interest (restaurants, museums, attractions, accommodation, etc.) in Bavaria. Filter by geo radius, full-text search, and classification IDs. Returns POI names, addresses, coordinates, and IDs. Use get_item for full details.",
    {
      latitude: z.number().optional().describe("Center latitude for geo search"),
      longitude: z.number().optional().describe("Center longitude for geo search"),
      radius_m: z.number().optional().describe("Search radius in meters (default 5000)"),
      query: z.string().optional().describe("Full-text search term"),
      classification_ids: z
        .array(z.string())
        .optional()
        .describe("Filter by classification UUIDs. Use list_classification_trees + get_classifications to discover IDs."),
      page: z.number().optional().describe("Page number, starting at 1 (default 1)"),
      page_size: z.number().optional().describe("Results per page, max 50 (default 20)"),
    },
    async ({
      latitude,
      longitude,
      radius_m = 5000,
      query,
      classification_ids,
      page = 1,
      page_size = 20,
    }) => {
      if (!config.BCT_ENDPOINT_POIS) {
        return { content: [{ type: "text" as const, text: "BCT_ENDPOINT_POIS is not configured in .env" }] };
      }

      const filter: Record<string, unknown> = {};

      if (latitude !== undefined && longitude !== undefined) {
        filter["geo"] = { in: { perimeter: [longitude, latitude, radius_m] } };
      }

      if (query) filter["q"] = query;

      if (classification_ids?.length) {
        filter["classifications"] = { in: { withSubtree: [classification_ids.join(",")] } };
      }

      try {
        const data = await bctPost(endpointPath(config.BCT_ENDPOINT_POIS), {
          filter: Object.keys(filter).length ? filter : undefined,
          fields: FIELDS,
          page: { size: Math.min(page_size, 50), number: page },
          section: sectionFor(page),
        });

        const items = (data["@graph"] ?? []).map((r) => formatPoi(r as BctGraph));
        const hasMore = !!data.links?.next;
        const note = paginationNote(items.length, hasMore, page);

        return {
          content: [{ type: "text" as const, text: `${note}\n${JSON.stringify(items, null, 2)}` }],
        };
      } catch (err) {
        return { content: [{ type: "text" as const, text: `Error: ${(err as Error).message}` }] };
      }
    }
  );
}
