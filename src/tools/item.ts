import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { bctPost } from "../lib/bct";
import { formatItem, BctGraph } from "../lib/format";

export function registerItemTools(server: McpServer): void {
  server.tool(
    "get_item",
    "Fetch full details for a single BayernCloud item (event, tour, POI, or any content type) by its UUID. Use the IDs returned by search_events, search_tours, or search_pois.",
    {
      id: z.string().describe("UUID of the item to fetch"),
      include: z
        .string()
        .optional()
        .describe(
          "Comma-separated linked fields to expand (e.g. 'image,location'). Nested with dot notation: 'image.author'"
        ),
      fields: z
        .string()
        .optional()
        .describe(
          "Comma-separated fields to return. Omit for all fields. Paths auto-include linked content: 'name,image.contentUrl'"
        ),
    },
    async ({ id, include, fields }) => {
      try {
        // GET /api/v4/things/{id} returns a single item, not a @graph array
        const data = await bctPost(`/things/${id}`, { include, fields });
        const graph = data["@graph"];
        const raw: BctGraph = graph ? (graph[0] as BctGraph) : (data as unknown as BctGraph);
        return {
          content: [{ type: "text" as const, text: JSON.stringify(formatItem(raw), null, 2) }],
        };
      } catch (err) {
        return { content: [{ type: "text" as const, text: `Error: ${(err as Error).message}` }] };
      }
    }
  );
}
