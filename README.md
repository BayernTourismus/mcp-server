# BayernCloud MCP Server

A [Model Context Protocol (MCP)](https://modelcontextprotocol.io) server that exposes the BayernCloud Tourismus API to AI assistants like Claude. Provides search, filtering, and geo tools for Bavarian tourism data — events, tours, POIs, and gastronomy.

## Tools

### Search
| Tool | Description |
|---|---|
| `search_events` | Events by geo radius, date range, full-text, and classification |
| `search_tours` | Tours with filters for length, elevation gain (Höhenmeter), duration, circular trail |
| `search_pois` | Points of Interest by geo, full-text, and classification |
| `search_gastronomy` | Restaurants, cafés, bars by geo, full-text, and classification |

### Details
| Tool | Description |
|---|---|
| `get_item` | Full details for any item by UUID |
| `get_elevation_profile` | Elevation profile (Höhenprofil) for a tour |

### Classifications
| Tool | Description |
|---|---|
| `list_classification_trees` | All available category trees (cached 30 min) |
| `get_classifications` | Categories within a tree — use IDs to filter search results |

### Utilities
| Tool | Description |
|---|---|
| `suggest` | Title autocomplete for events, tours, or POIs |
| `geocode` | Address → coordinates |
| `reverse_geocode` | Coordinates → address |
| `route_distance` | Driving distance between two points (OSRM) |
| `haversine_distance` | Straight-line distance between two points |

## Setup

### Prerequisites

- Node.js v18+
- BayernCloud Tourismus API token — get one at [bayerncloud.digital](https://bayerncloud.digital/)

### Installation

```bash
git clone <repo>
cd mcp-server
npm install
npm run build
```

### Configuration

Copy `.env.example` to `.env` and fill in your values:

```env
BCT_API_TOKEN=your_token_here
BAYERN_CLOUD_API_URL=https://data.bayerncloud.digital/api/v4

# Endpoint UUIDs — copy from the end of the endpoint URL in the BayernCloud portal
BCT_ENDPOINT_EVENTS=107df2c2-ff3e-4eaa-b24c-863d85d505d1
BCT_ENDPOINT_TOURS=cd177e6a-c6db-4efd-84a6-decf4a3711de
BCT_ENDPOINT_POIS=7b228c8c-23f5-49b9-b55e-e18e73386fbb
BCT_ENDPOINT_GASTRONOMY=5453abda-5e76-43f0-acdf-4855c3cb351e

# Geocoding (optional — defaults shown)
NOMINATIM_BASE_URL=https://nominatim.openstreetmap.org
OSRM_BASE_URL=http://router.project-osrm.org
```

## Usage

### Local (Claude Desktop)

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "bayerncloud-mcp": {
      "command": "node",
      "args": ["/path/to/mcp-server/dist/index.js"]
    }
  }
}
```

### Public HTTP Server

The server also runs as a public HTTP endpoint (Streamable HTTP transport, rate-limited to 60 req/min per IP):

```bash
PORT=3000 npm run start:http
```

Endpoints:
- `POST /mcp` — MCP endpoint
- `GET /health` — health check

Add to Claude as a remote MCP server:

```json
{
  "mcpServers": {
    "bayerncloud-mcp": {
      "type": "http",
      "url": "https://your-deployment.example.com/mcp"
    }
  }
}
```

#### Deploy to Railway

```bash
npm run build
railway login && railway init && railway up
```

Set the same environment variables from `.env` in the Railway dashboard. `PORT` is set automatically.

## Development

```bash
npm run build      # compile TypeScript → dist/
npm run start      # run stdio server (local)
npm run start:http # run HTTP server (public)
npm run dev        # watch mode
```

## Architecture

```
src/
  index.ts          # stdio entry point (Claude Desktop)
  server-http.ts    # HTTP entry point (public deployment)
  lib/
    create-server.ts  # registers all tools on an McpServer instance
    bct.ts            # BayernCloud API client
    config.ts         # environment variables + dotenv
    format.ts         # response formatters (strips JSON-LD overhead)
    cache.ts          # TTL cache for classification data
    nominatim.ts      # Nominatim + OSRM client
  tools/
    events.ts         # search_events
    tours.ts          # search_tours
    pois.ts           # search_pois
    gastronomy.ts     # search_gastronomy
    item.ts           # get_item
    elevation.ts      # get_elevation_profile
    classifications.ts # list_classification_trees, get_classifications
    suggest.ts        # suggest
    geocoding.ts      # geocode, reverse_geocode, route_distance, haversine_distance
```

The BCT API token is never exposed to clients — it stays server-side for both local and public deployments.

## License

MIT
