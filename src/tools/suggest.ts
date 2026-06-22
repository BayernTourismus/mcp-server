import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { bctPost, endpointPath } from "../lib/bct";
import { config } from "../lib/config";

const ENDPOINTS = {
  events: () => config.BCT_ENDPOINT_EVENTS,
  tours: () => config.BCT_ENDPOINT_TOURS,
  pois: () => config.BCT_ENDPOINT_POIS,
} as const;

type ContentType = keyof typeof ENDPOINTS;

export function registerSuggestTools(server: McpServer): void {
  server.tool(
    "suggest",
    "Autocomplete / title suggestions for events, tours, or POIs. Returns a list of matching titles for a partial search term. Useful before calling search_events/search_tours/search_pois.",
    {
      content_type: z
        .enum(["events", "tours", "pois"])
        .describe("Which content type to search against"),
      search: z.string().describe("Partial title to complete"),
    },
    async ({ content_type, search }) => {
      const endpointId = ENDPOINTS[content_type as ContentType]();
      if (!endpointId) {
        return {
          content: [
            {
              type: "text" as const,
              text: `BCT_ENDPOINT_${content_type.toUpperCase()} is not configured in .env`,
            },
          ],
        };
      }

      try {
        const data = await bctPost(`${endpointPath(endpointId)}/suggest_by_title`, {
          search,
        });

        const graph = data["@graph"] as Record<string, unknown> | undefined;
        const suggestions = (graph?.["suggest"] as string[] | undefined) ?? [];

        return {
          content: [
            {
              type: "text" as const,
              text:
                suggestions.length > 0
                  ? `Suggestions:\n${suggestions.map((s) => `- ${s}`).join("\n")}`
                  : "No suggestions found.",
            },
          ],
        };
      } catch (err) {
        return { content: [{ type: "text" as const, text: `Error: ${(err as Error).message}` }] };
      }
    }
  );
}
