import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerEventsTools } from "../tools/events";
import { registerToursTools } from "../tools/tours";
import { registerPoisTools } from "../tools/pois";
import { registerGastronomyTools } from "../tools/gastronomy";
import { registerItemTools } from "../tools/item";
import { registerElevationTools } from "../tools/elevation";
import { registerClassificationTools } from "../tools/classifications";
import { registerSuggestTools } from "../tools/suggest";
import { registerGeocodingTools } from "../tools/geocoding";

export function createMcpServer(): McpServer {
  const server = new McpServer({
    name: "bayerncloud-mcp-server",
    version: "2.0.0",
  });

  registerEventsTools(server);
  registerToursTools(server);
  registerPoisTools(server);
  registerGastronomyTools(server);
  registerItemTools(server);
  registerElevationTools(server);
  registerClassificationTools(server);
  registerSuggestTools(server);
  registerGeocodingTools(server);

  return server;
}
