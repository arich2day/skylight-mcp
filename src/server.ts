import { readFileSync } from 'fs';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { SkylightClient } from './api/client.js';

// Dynamically read version from package.json with fallback
let serverVersion = '2.0.0';
try {
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf-8'));
  serverVersion = pkg.version || '2.0.0';
} catch {
  serverVersion = '2.0.0';
}

export async function createServer(): Promise<Server> {
  const client = new SkylightClient();
  await client.initialize();

  const server = new Server(
    {
      name: 'skylight-mcp',
      version: serverVersion,
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  const tools: Tool[] = [
    // 1. Subscription & Account
    {
      name: 'check_plus_subscription',
      description: 'Checks whether the user has an active Skylight Plus subscription, expiration date, and feature access.',
      inputSchema: { type: 'object', properties: {} },
    },
    // 2. Calendar
    {
      name: 'list_events',
      description: 'Lists calendar events for a specific date range.',
      inputSchema: {
        type: 'object',
        properties: {
          date_min: { type: 'string', description: 'Start date in YYYY-MM-DD format.' },
          date_max: { type: 'string', description: 'End date in YYYY-MM-DD format.' },
          timezone: { type: 'string', description: 'Optional timezone name (e.g. America/New_York).' },
          frame_id: { type: 'string', description: 'Optional frame ID.' },
        },
      },
    },
    {
      name: 'create_event',
      description: 'Creates a new calendar event on the Skylight frame.',
      inputSchema: {
        type: 'object',
        properties: {
          summary: { type: 'string', description: 'Title or summary of the event.' },
          start: { type: 'string', description: 'Start ISO timestamp or date (e.g. 2026-08-20T14:00:00).' },
          end: { type: 'string', description: 'End ISO timestamp or date (e.g. 2026-08-20T15:00:00).' },
          all_day: { type: 'boolean', description: 'Whether this is an all-day event.' },
          category_id: { type: 'string', description: 'Optional category/person ID to color-code the event.' },
          frame_id: { type: 'string', description: 'Optional frame ID.' },
        },
        required: ['summary', 'start', 'end'],
      },
    },
    {
      name: 'update_event',
      description: 'Updates an existing calendar event.',
      inputSchema: {
        type: 'object',
        properties: {
          event_id: { type: 'string', description: 'ID of the event to update.' },
          summary: { type: 'string', description: 'New title/summary.' },
          start: { type: 'string', description: 'New start timestamp.' },
          end: { type: 'string', description: 'New end timestamp.' },
          category_id: { type: 'string', description: 'New category ID.' },
          frame_id: { type: 'string', description: 'Optional frame ID.' },
        },
        required: ['event_id'],
      },
    },
    {
      name: 'delete_event',
      description: 'Deletes a calendar event from Skylight.',
      inputSchema: {
        type: 'object',
        properties: {
          event_id: { type: 'string', description: 'ID of the event to delete.' },
          frame_id: { type: 'string', description: 'Optional frame ID.' },
        },
        required: ['event_id'],
      },
    },
    {
      name: 'list_categories',
      description: 'Lists all calendar categories, profiles, and color tags on the Skylight frame.',
      inputSchema: {
        type: 'object',
        properties: {
          frame_id: { type: 'string', description: 'Optional frame ID.' },
        },
      },
    },
    // 3. Chores
    {
      name: 'list_chores',
      description: 'Lists chore and task assignments for household members.',
      inputSchema: {
        type: 'object',
        properties: {
          after: { type: 'string', description: 'Start date YYYY-MM-DD.' },
          before: { type: 'string', description: 'End date YYYY-MM-DD.' },
          include_late: { type: 'boolean', description: 'Include overdue chores (default true).' },
          frame_id: { type: 'string', description: 'Optional frame ID.' },
        },
      },
    },
    {
      name: 'update_chore',
      description: 'Updates a chore status (e.g. mark completed or pending).',
      inputSchema: {
        type: 'object',
        properties: {
          chore_id: { type: 'string', description: 'The ID of the chore to update.' },
          status: { type: 'string', enum: ['completed', 'pending'], description: 'New status for the chore.' },
          frame_id: { type: 'string', description: 'Optional frame ID.' },
        },
        required: ['chore_id', 'status'],
      },
    },
    // 4. Lists & Groceries
    {
      name: 'list_lists',
      description: 'Lists all checklists and grocery lists on the frame.',
      inputSchema: {
        type: 'object',
        properties: {
          frame_id: { type: 'string', description: 'Optional frame ID.' },
        },
      },
    },
    {
      name: 'add_list_item',
      description: 'Adds an item to a specific Skylight list (e.g. grocery list).',
      inputSchema: {
        type: 'object',
        properties: {
          list_id: { type: 'string', description: 'The ID of the target list.' },
          text: { type: 'string', description: 'The text of the item to add.' },
          frame_id: { type: 'string', description: 'Optional frame ID.' },
        },
        required: ['list_id', 'text'],
      },
    },
    // 5. Meals
    {
      name: 'list_meals',
      description: 'Retrieves planned meals and recipes from the Skylight meal planner.',
      inputSchema: {
        type: 'object',
        properties: {
          frame_id: { type: 'string', description: 'Optional frame ID.' },
        },
      },
    },
    // 6. Rewards
    {
      name: 'list_rewards',
      description: 'Retrieves chore reward points and redemption options.',
      inputSchema: {
        type: 'object',
        properties: {
          frame_id: { type: 'string', description: 'Optional frame ID.' },
        },
      },
    },
    // 7. Frames
    {
      name: 'list_frames',
      description: 'Lists all Skylight frames connected to this account.',
      inputSchema: { type: 'object', properties: {} },
    },
  ];

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools,
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case 'check_plus_subscription': {
          const res = await client.getPlusAccess();
          return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
        }
        case 'list_events': {
          const res = await client.getCalendarEvents(args as any, args?.frame_id as string);
          return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
        }
        case 'create_event': {
          const res = await client.createCalendarEvent(args, args?.frame_id as string);
          return { content: [{ type: 'text', text: `Event created: ${JSON.stringify(res, null, 2)}` }] };
        }
        case 'update_event': {
          const { event_id, frame_id, ...data } = args as any;
          const res = await client.updateCalendarEvent(event_id, data, frame_id);
          return { content: [{ type: 'text', text: `Event updated: ${JSON.stringify(res, null, 2)}` }] };
        }
        case 'delete_event': {
          const res = await client.deleteCalendarEvent(args?.event_id as string, args?.frame_id as string);
          return { content: [{ type: 'text', text: `Event deleted: ${JSON.stringify(res, null, 2)}` }] };
        }
        case 'list_categories': {
          const res = await client.getCategories(args?.frame_id as string);
          return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
        }
        case 'list_chores': {
          const res = await client.getChores(args as any, args?.frame_id as string);
          return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
        }
        case 'update_chore': {
          const { chore_id, frame_id, ...data } = args as any;
          const res = await client.updateChore(chore_id, data, frame_id);
          return { content: [{ type: 'text', text: `Chore updated: ${JSON.stringify(res, null, 2)}` }] };
        }
        case 'list_lists': {
          const res = await client.getLists(args?.frame_id as string);
          return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
        }
        case 'add_list_item': {
          const res = await client.addListItem(args?.list_id as string, args?.text as string, args?.frame_id as string);
          return { content: [{ type: 'text', text: `Item added: ${JSON.stringify(res, null, 2)}` }] };
        }
        case 'list_meals': {
          const res = await client.getMeals(args?.frame_id as string);
          return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
        }
        case 'list_rewards': {
          const res = await client.getRewards(args?.frame_id as string);
          return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
        }
        case 'list_frames': {
          const res = await client.getFrames();
          return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
        }
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (err: any) {
      return {
        content: [{ type: 'text', text: `Error: ${err.message}` }],
        isError: true,
      };
    }
  });

  return server;
}