import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { bctPost, endpointPath, sectionFor } from "../lib/bct";
import { config } from "../lib/config";
import { formatEvent, paginationNote, BctGraph } from "../lib/format";

// Only fetch what the LLM actually needs; linked fields are auto-included via fields paths
const FIELDS =
  "name,description,startDate,endDate," +
  "location.name,location.address,location.geo," +
  "eventSchedule.startDate,eventSchedule.endDate,eventSchedule.startTime,eventSchedule.endTime";

export function registerEventsTools(server: McpServer): void {
  server.tool(
    "search_events",
    "Search for tourism events in Bavaria. Filter by geo radius (around a lat/lng), date range, full-text, and classification IDs. Returns event names, dates, times, venue details, and IDs. Use get_item for full details on a specific event.",
    {
      start_date: z.string().describe("Start of date range, YYYY-MM-DD"),
      end_date: z.string().describe("End of date range, YYYY-MM-DD"),
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
      start_date,
      end_date,
      latitude,
      longitude,
      radius_m = 5000,
      query,
      classification_ids,
      page = 1,
      page_size = 20,
    }) => {
      if (!config.BCT_ENDPOINT_EVENTS) {
        return { content: [{ type: "text" as const, text: "BCT_ENDPOINT_EVENTS is not configured in .env" }] };
      }

      // `schedule` is the special top-level recurring-event filter — different from
      // `attribute.eventSchedule` which does a direct attribute lookup and misses recurrence rules.
      const filter: Record<string, unknown> = {
        schedule: { in: { min: start_date, max: end_date } },
      };

      if (latitude !== undefined && longitude !== undefined) {
        filter["linked"] = {
          location: { geo: { in: { perimeter: [longitude, latitude, radius_m] } } },
        };
      }

      if (query) filter["q"] = query;

      if (classification_ids?.length) {
        filter["classifications"] = { in: { withSubtree: [classification_ids.join(",")] } };
      }

      try {
        const data = await bctPost(endpointPath(config.BCT_ENDPOINT_EVENTS), {
          filter,
          include: "location,eventSchedule",
          fields: FIELDS,
          page: { size: Math.min(page_size, 50), number: page },
          section: sectionFor(page),
        });

        const items = (data["@graph"] ?? []).map((r) => formatEvent(r as BctGraph));
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
