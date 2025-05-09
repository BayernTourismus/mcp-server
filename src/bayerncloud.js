#!/usr/bin/env node
const { Server } = require("@modelcontextprotocol/sdk/server/index.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const fetch = require("node-fetch");

const BAYERN_CLOUD_API_URL = process.env.BAYERN_CLOUD_API_URL || "https://data.bayerncloud.digital/api/v4/endpoints";
const BCT_API_TOKEN = process.env.BCT_API_TOKEN;
if (!BCT_API_TOKEN) {
  console.error("BCT_API_TOKEN Umgebungsvariable ist erforderlich.");
  process.exit(1);
}

const server = new Server(
  { name: "bayerncloud-mcp-server", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

// Define the tools with the required inputSchema property
const TOOLS = [
  {
    name: "about",
    description: "Returns information about this MCP server",
    inputSchema: {
      type: "object",
      properties: {},
      required: []
    }
  },
  {
    name: "list_events",
    description: "Retrieve events near a specific location within a date range.",
    inputSchema: {
      type: "object",
      properties: {
        latitude: {
          type: "number",
          description: "Latitude of the center point for event search"
        },
        longitude: {
          type: "number",
          description: "Longitude of the center point for event search"
        },
        radius: {
          type: "number",
          description: "Search radius in meters (default: 5000)",
          default: 5000
        },
        start_date: {
          type: "string",
          description: "Start date in YYYY-MM-DD format"
        },
        end_date: {
          type: "string",
          description: "End date in YYYY-MM-DD format"
        }
      },
      required: ["latitude", "longitude", "start_date", "end_date"]
    }
  }
];

// Handle all requests
server.fallbackRequestHandler = async (request) => {
  try {
    const { method, params, id } = request;
    console.error(`REQUEST: ${method} [${id}]`);
    
    // Initialize
    if (method === "initialize") {
      return {
        protocolVersion: "2025-04-30",
        capabilities: { tools: {} },
        serverInfo: { name: "bayerncloud-mcp-server", version: "1.0.0" }
      };
    }
    
    // Tools list
    if (method === "tools/list") {
      //console.error(`TOOLS: ${JSON.stringify(TOOLS)}`);
      return { tools: TOOLS };
    }
    
    // Tool call
    if (method === "tools/call") {
      const { name, arguments: args = {} } = params || {};
      
      if (name === "about") {
        return {
          content: [
            { 
              type: "text", 
              text: `This is a Bayern Cloud MCP server (version 1.0.0).\n\nIt provides access to touristic information from the Bayern Cloud API.` 
            }
          ]
        };
      }

      if (name === "list_events") {
        const { latitude, longitude, radius = 5000, start_date, end_date } = args;
        
        if (!latitude || !longitude || !start_date || !end_date) {
          return {
            error: {
              code: -32602,
              message: "Missing required parameters: latitude, longitude, start_date, end_date"
            }
          };
        }

        console.error(`Retrieving events near [${latitude}, ${longitude}] from ${start_date} to ${end_date}`);

        try {
          // Versuche API-Daten zu holen
          let events = [];
          try {
            const response = await fetch(`${BAYERN_CLOUD_API_URL}/list_events`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                token: BCT_API_TOKEN,
                include: "location,eventSchedule",
                filter: {
                  linked: {
                    location: {
                      geo: {
                        in: {
                          perimeter: [longitude, latitude, radius]
                        }
                      }
                    }
                  },
                  schedule: {
                    in: {
                      min: start_date,
                      max: end_date
                    }
                  }
                }
              })
            });

            if (!response.ok) {
              const errorText = await response.text();
              console.error(`API error (${response.status}): ${errorText}`);
              //Return empty events if API call fails
              events = [];
            } else {
              const data = await response.json();
              
              // Format the events data from the @graph array in the JSON-LD response
              events = data['@graph'] || [];
              events = events.map(event => {
                // Extract location data if present
                console.error(`Event: ${JSON.stringify(event.location)}`);
                const locationInfo = event.location && event.location.length > 0
                  ? {
                      name: event.location[0].name || "Unknown venue",
                      address: event.location[0].address ? formatAddress(event.location[0].address) : "No address available",
                      geo: event.location[0].geo ? {
                        latitude: event.location[0].geo.latitude,
                        longitude: event.location[0].geo.longitude
                      } : null
                    }
                  : { name: "Unknown location", address: "No address available", geo: null };

                // Format the schedule information
                const scheduleInfo = getScheduleInfo(event);

                return {
                  id: event['@id'] || "Unknown ID",
                  title: event.name || "Unnamed Event",
                  description: event.description || "No description available",
                  location: locationInfo,
                  startDate: event.startDate || scheduleInfo.startDateTime || "Unknown start date",
                  endDate: event.endDate || scheduleInfo.endDateTime || "Unknown end date"
                };
              });
            }
          } catch (apiError) {
            console.error(`API connection error: ${apiError.message}`);
            // Return empty events if API call fails
            events = [];
          }

          // Garantiere, dass events ein Array ist
          if (!Array.isArray(events)) {
            events = [];
          }

          const resultText = events.length > 0
            ? `Found ${events.length} events near [${latitude}, ${longitude}] from ${start_date} to ${end_date}.`
            : `No events found near [${latitude}, ${longitude}] from ${start_date} to ${end_date}.`;

          // Konvertiere JSON zu Text, da nur "text" als Content-Type sicher unterstützt wird
          return {
            content: [
              { type: "text", text: resultText },
              { 
                type: "text", 
                text: JSON.stringify(events, null, 2)
              }
            ]
          };
        } catch (error) {
          console.error(`Error in list_events: ${error.message}`);
          return {
            content: [
              { 
                type: "text", 
                text: `Error retrieving events: ${error.message}`
              }
            ]
          };
        }
      }

      return {
        error: {
          code: -32601,
          message: `Tool not found: ${name}`
        }
      };
    }
    
    // Required empty responses
    if (method === "resources/list") return { resources: [] };
    if (method === "prompts/list") return { prompts: [] };
    
    // Empty response for unhandled methods
    return {};
    
  } catch (error) {
    console.error(`ERROR: ${error.message}`);
    return {
      error: {
        code: -32603,
        message: "Internal error",
        data: { details: error.message }
      }
    };
  }
};

// Helper function to format address
function formatAddress(address) {
  if (!address) return "No address available";
  
  let parts = [];
  if (address.streetAddress) parts.push(address.streetAddress);
  if (address.postalCode && address.addressLocality) {
    let cityPart = [address.postalCode, address.addressLocality]
      .filter(Boolean)
      .join(" ");
    if (cityPart) parts.push(cityPart);
  }
  return parts.join(", ") || "No address details";
}

// Helper function to extract schedule information
function getScheduleInfo(event) {
  // First try to use eventSchedule
  if (event.eventSchedule && event.eventSchedule.length > 0) {
    const schedule = event.eventSchedule[0];
    return {
      startDateTime: schedule.startDate && schedule.startTime 
        ? `${schedule.startDate}T${schedule.startTime}` 
        : schedule.startDate || null,
      endDateTime: schedule.endDate && schedule.endTime 
        ? `${schedule.endDate}T${schedule.endTime}` 
        : schedule.endDate || null,
      timezone: schedule.scheduleTimezone || "Europe/Vienna" // Default timezone
    };
  }
  
  // Otherwise use event start and end dates directly
  return {
    startDateTime: event.startDate || null,
    endDateTime: event.endDate || null
  };
}

// Connect to stdio transport
const transport = new StdioServerTransport();

// Stay alive on SIGTERM
process.on("SIGTERM", () => {
  console.error("SIGTERM received but staying alive");
});

// Connect server
server.connect(transport)
  .then(() => console.error("Server connected"))
  .catch(error => {
    console.error(`Connection error: ${error.message}`);
    process.exit(1);
  });