import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

export const config = {
  BCT_API_URL: process.env.BAYERN_CLOUD_API_URL ?? "https://data.bayerncloud.digital/api/v4",
  BCT_API_TOKEN: process.env.BCT_API_TOKEN ?? "",
  BCT_ENDPOINT_EVENTS: process.env.BCT_ENDPOINT_EVENTS ?? "",
  BCT_ENDPOINT_TOURS: process.env.BCT_ENDPOINT_TOURS ?? "",
  BCT_ENDPOINT_POIS: process.env.BCT_ENDPOINT_POIS ?? "",
  BCT_ENDPOINT_GASTRONOMY: process.env.BCT_ENDPOINT_GASTRONOMY ?? "",
  NOMINATIM_URL: process.env.NOMINATIM_BASE_URL ?? "https://nominatim.openstreetmap.org",
  OSRM_URL: process.env.OSRM_BASE_URL ?? "http://router.project-osrm.org",
} as const;

export function validateConfig(): void {
  if (!config.BCT_API_TOKEN) {
    console.error("BCT_API_TOKEN is required");
    process.exit(1);
  }
  if (!config.BCT_ENDPOINT_EVENTS) console.error("Warning: BCT_ENDPOINT_EVENTS not set");
  if (!config.BCT_ENDPOINT_TOURS) console.error("Warning: BCT_ENDPOINT_TOURS not set");
  if (!config.BCT_ENDPOINT_POIS) console.error("Warning: BCT_ENDPOINT_POIS not set");
  if (!config.BCT_ENDPOINT_GASTRONOMY) console.error("Warning: BCT_ENDPOINT_GASTRONOMY not set");
}
