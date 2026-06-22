import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { geocode, reverseGeocode, routeDistance, haversineKm } from "../lib/nominatim";

export function registerGeocodingTools(server: McpServer): void {
  server.tool(
    "geocode",
    "Convert an address or place name to coordinates (latitude/longitude). Useful to get coordinates before calling search_events, search_tours, or search_pois with a geo filter.",
    {
      address: z.string().describe("Address or place name to look up"),
    },
    async ({ address }) => {
      try {
        const result = await geocode(address);
        if (!result) {
          return { content: [{ type: "text" as const, text: "Address not found." }] };
        }
        return {
          content: [
            {
              type: "text" as const,
              text: `Coordinates: lat=${result.lat}, lng=${result.lng}\nDisplay name: ${result.displayName}`,
            },
          ],
        };
      } catch (err) {
        return { content: [{ type: "text" as const, text: `Error: ${(err as Error).message}` }] };
      }
    }
  );

  server.tool(
    "reverse_geocode",
    "Convert coordinates (latitude/longitude) to a human-readable address.",
    {
      latitude: z.number().describe("Latitude"),
      longitude: z.number().describe("Longitude"),
    },
    async ({ latitude, longitude }) => {
      try {
        const address = await reverseGeocode(latitude, longitude);
        return { content: [{ type: "text" as const, text: address }] };
      } catch (err) {
        return { content: [{ type: "text" as const, text: `Error: ${(err as Error).message}` }] };
      }
    }
  );

  server.tool(
    "route_distance",
    "Calculate the driving route distance between two coordinates using OSRM. Returns distance in kilometers.",
    {
      lat1: z.number().describe("Latitude of origin"),
      lng1: z.number().describe("Longitude of origin"),
      lat2: z.number().describe("Latitude of destination"),
      lng2: z.number().describe("Longitude of destination"),
    },
    async ({ lat1, lng1, lat2, lng2 }) => {
      try {
        const distanceM = await routeDistance(lat1, lng1, lat2, lng2);
        if (distanceM === null) {
          return { content: [{ type: "text" as const, text: "Could not calculate route." }] };
        }
        return {
          content: [
            { type: "text" as const, text: `Driving distance: ${(distanceM / 1000).toFixed(2)} km` },
          ],
        };
      } catch (err) {
        return { content: [{ type: "text" as const, text: `Error: ${(err as Error).message}` }] };
      }
    }
  );

  server.tool(
    "haversine_distance",
    "Calculate the straight-line (as-the-crow-flies) distance between two coordinates. Returns distance in kilometers.",
    {
      lat1: z.number().describe("Latitude of first point"),
      lng1: z.number().describe("Longitude of first point"),
      lat2: z.number().describe("Latitude of second point"),
      lng2: z.number().describe("Longitude of second point"),
    },
    async ({ lat1, lng1, lat2, lng2 }) => {
      const km = haversineKm(lat1, lng1, lat2, lng2);
      return {
        content: [{ type: "text" as const, text: `Straight-line distance: ${km.toFixed(2)} km` }],
      };
    }
  );
}
