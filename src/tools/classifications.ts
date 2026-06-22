import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { bctPost } from "../lib/bct";
import { formatClassificationTree, formatConcept, paginationNote, BctGraph } from "../lib/format";
import { TtlCache } from "../lib/cache";

const treeCache = new TtlCache<BctGraph[]>(30 * 60 * 1000); // 30 min
const conceptCache = new TtlCache<BctGraph[]>(30 * 60 * 1000);

export function registerClassificationTools(server: McpServer): void {
  server.tool(
    "list_classification_trees",
    "List all available classification trees (concept schemes) in BayernCloud. Returns IDs and names. Use the IDs with get_classifications to browse categories for filtering search results.",
    {},
    async () => {
      const cacheKey = "trees";
      let items = treeCache.get(cacheKey);

      if (!items) {
        try {
          const data = await bctPost("/concept_schemes", { section: { meta: 0 } });
          items = (data["@graph"] ?? []) as BctGraph[];
          treeCache.set(cacheKey, items);
        } catch (err) {
          return { content: [{ type: "text" as const, text: `Error: ${(err as Error).message}` }] };
        }
      }

      const formatted = items.map(formatClassificationTree);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(formatted, null, 2) }],
      };
    }
  );

  server.tool(
    "get_classifications",
    "Get all concepts (categories) within a classification tree. Returns concept IDs, names, and parent IDs for building hierarchical filters. Pass classification IDs to search_events, search_tours, or search_pois to filter by category.",
    {
      concept_scheme_id: z.string().describe("UUID of the classification tree (from list_classification_trees)"),
      page: z.number().optional().describe("Page number (default 1)"),
      page_size: z.number().optional().describe("Results per page (default 100)"),
    },
    async ({ concept_scheme_id, page = 1, page_size = 100 }) => {
      const cacheKey = `${concept_scheme_id}:${page}:${page_size}`;
      let items = conceptCache.get(cacheKey);

      if (!items) {
        try {
          const data = await bctPost(`/concept_schemes/${concept_scheme_id}/concepts`, {
            page: { size: page_size, number: page },
            section: { meta: 0 },
          });
          items = (data["@graph"] ?? []) as BctGraph[];
          conceptCache.set(cacheKey, items);
        } catch (err) {
          return { content: [{ type: "text" as const, text: `Error: ${(err as Error).message}` }] };
        }
      }

      const formatted = items.map(formatConcept);
      const note = paginationNote(formatted.length, formatted.length === page_size, page);
      return {
        content: [{ type: "text" as const, text: `${note}\n${JSON.stringify(formatted, null, 2)}` }],
      };
    }
  );
}
