import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { bctPost, endpointPath } from "../lib/bct";
import { config } from "../lib/config";

export function registerElevationTools(server: McpServer): void {
  server.tool(
    "get_elevation_profile",
    "Get the elevation profile (Höhenprofil) for a specific tour. Returns distance-elevation data points along the route. Only works for tours that have elevation data stored.",
    {
      tour_id: z.string().describe("UUID of the tour (from search_tours or get_item)"),
    },
    async ({ tour_id }) => {
      if (!config.BCT_ENDPOINT_TOURS) {
        return { content: [{ type: "text" as const, text: "BCT_ENDPOINT_TOURS is not configured in .env" }] };
      }

      try {
        const res = await fetch(
          `${config.BCT_API_URL}${endpointPath(config.BCT_ENDPOINT_TOURS)}/${tour_id}/elevation_profile`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token: config.BCT_API_TOKEN, dataFormat: "object" }),
          }
        );

        if (!res.ok) {
          const text = await res.text();
          // 404/error means no elevation data for this tour
          return { content: [{ type: "text" as const, text: `No elevation data available: ${text.slice(0, 200)}` }] };
        }

        const data = (await res.json()) as {
          data?: Array<{ x: number; y: number; coordinates: [number, number] }>;
          meta?: { scaleX: string; scaleY: string };
        };

        const points = data.data ?? [];
        if (!points.length) {
          return { content: [{ type: "text" as const, text: "No elevation data available for this tour." }] };
        }

        const elevations = points.map((p) => p.y);
        const distances = points.map((p) => p.x);
        const summary = {
          total_distance_m: Math.round(distances[distances.length - 1]),
          min_elevation_m: Math.round(Math.min(...elevations)),
          max_elevation_m: Math.round(Math.max(...elevations)),
          sample_count: points.length,
          // Include full profile for charting/analysis
          profile: points.map((p) => ({
            distance_m: Math.round(p.x),
            elevation_m: Math.round(p.y),
            coordinates: p.coordinates,
          })),
        };

        return {
          content: [{ type: "text" as const, text: JSON.stringify(summary, null, 2) }],
        };
      } catch (err) {
        return { content: [{ type: "text" as const, text: `Error: ${(err as Error).message}` }] };
      }
    }
  );
}
