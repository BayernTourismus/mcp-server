import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { bctPost, endpointPath, sectionFor } from "../lib/bct";
import { config } from "../lib/config";
import { formatTour, paginationNote, BctGraph } from "../lib/format";

const FIELDS =
  "name,description,url,odta:circularTrail," +
  "dc:length,dc:ascent,dc:descent,dc:duration,dc:minAltitude,dc:maxAltitude," +
  "odta:startLocation.geo";

export function registerToursTools(server: McpServer): void {
  server.tool(
    "search_tours",
    "Search for hiking and cycling tours in Bavaria. Filter by geo radius, length, elevation gain (Höhenmeter), duration, difficulty score, and more. Returns tour stats and IDs. Use get_item for full route geometry.",
    {
      latitude: z.number().optional().describe("Center latitude for geo search"),
      longitude: z.number().optional().describe("Center longitude for geo search"),
      radius_m: z.number().optional().describe("Search radius in meters (default 10000)"),
      query: z.string().optional().describe("Full-text search term"),
      classification_ids: z
        .array(z.string())
        .optional()
        .describe("Filter by classification UUIDs. Use list_classification_trees + get_classifications to discover IDs."),
      min_length_m: z.number().optional().describe("Minimum tour length in meters (dc:length)"),
      max_length_m: z.number().optional().describe("Maximum tour length in meters (dc:length)"),
      min_ascent_m: z.number().optional().describe("Minimum elevation gain in meters / Mindest-Höhenmeter (dc:ascent)"),
      max_ascent_m: z.number().optional().describe("Maximum elevation gain in meters / Max-Höhenmeter (dc:ascent)"),
      min_duration_min: z.number().optional().describe("Minimum duration in minutes (dc:duration)"),
      max_duration_min: z.number().optional().describe("Maximum duration in minutes (dc:duration)"),
      circular_only: z.boolean().optional().describe("Only circular trails / nur Rundtouren (odta:circularTrail)"),
      min_score: z.number().optional().describe("Minimum content quality score 0–100 (internalContentScore)"),
      page: z.number().optional().describe("Page number, starting at 1 (default 1)"),
      page_size: z.number().optional().describe("Results per page, max 20 (default 10)"),
    },
    async ({
      latitude,
      longitude,
      radius_m = 10000,
      query,
      classification_ids,
      min_length_m,
      max_length_m,
      min_ascent_m,
      max_ascent_m,
      min_duration_min,
      max_duration_min,
      circular_only,
      min_score,
      page = 1,
      page_size = 10,
    }) => {
      if (!config.BCT_ENDPOINT_TOURS) {
        return { content: [{ type: "text" as const, text: "BCT_ENDPOINT_TOURS is not configured in .env" }] };
      }

      const filter: Record<string, unknown> = {};

      if (latitude !== undefined && longitude !== undefined) {
        filter["geo"] = { in: { perimeter: [longitude, latitude, radius_m] } };
      }

      if (query) filter["q"] = query;

      if (classification_ids?.length) {
        filter["classifications"] = { in: { withSubtree: [classification_ids.join(",")] } };
      }

      // Numeric and boolean attribute filters
      const attrFilter: Record<string, unknown> = {};

      if (min_length_m !== undefined || max_length_m !== undefined) {
        attrFilter["dc:length"] = { in: { min: min_length_m, max: max_length_m } };
      }
      if (min_ascent_m !== undefined || max_ascent_m !== undefined) {
        attrFilter["dc:ascent"] = { in: { min: min_ascent_m, max: max_ascent_m } };
      }
      if (min_duration_min !== undefined || max_duration_min !== undefined) {
        attrFilter["dc:duration"] = { in: { min: min_duration_min, max: max_duration_min } };
      }
      if (circular_only !== undefined) {
        attrFilter["odta:circularTrail"] = { in: { bool: circular_only } };
      }
      if (min_score !== undefined) {
        attrFilter["internalContentScore"] = { in: { min: min_score, max: 100 } };
      }

      if (Object.keys(attrFilter).length) {
        filter["attribute"] = attrFilter;
      }

      try {
        const data = await bctPost(endpointPath(config.BCT_ENDPOINT_TOURS), {
          filter: Object.keys(filter).length ? filter : undefined,
          fields: FIELDS,
          page: { size: Math.min(page_size, 20), number: page },
          section: sectionFor(page),
        });

        const items = (data["@graph"] ?? []).map((r) => formatTour(r as BctGraph));
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
