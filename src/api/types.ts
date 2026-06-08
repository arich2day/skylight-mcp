/**
 * TypeScript types for Skylight API responses (JSON:API format)
 */

// Base JSON:API structures
export interface JsonApiResourceId {
  type: string;
  id: string;
}

export interface JsonApiResponse<D, I = unknown> {
  data: D;
  included?: I[];
  meta?: Record<string, unknown>;
}

// Category (Family Member) types
export interface CategoryAttributes {
  label: string | null;
  color: string | null;
  selected_for_chore_chart: boolean | null;
  linked_to_profile: boolean | null;
  profile_pic_url: string | null;
}

export interface CategoryResource {
  type: "category";
  id: string;
  attributes: CategoryAttributes;
}

// Chore types
export interface ChoreAttributes {
  id?: number | null;
  summary: string;
  status: string;
  start: string;
  start_time: string | null;
  completed_on: string | null;
  is_future: boolean | null;
  recurring: boolean;
  recurring_until: string | null;
  recurrence_set: string[] | null;
  reward_points: number | null;
  emoji_icon: string | null;
  routine: boolean | null;
  position: number | null;
}

export interface ChoreRelationships {
  category?: {
    data: JsonApiResourceId | null;
  };
}

export interface ChoreResource {
  type: "chore";
  id: string;
  attributes: ChoreAttributes;
  relationships?: ChoreRelationships;
}

// List types
export interface ListAttributes {
  label: string;
  color: string | null;
  kind: "shopping" | "to_do";
  default_grocery_list: boolean;
}

export interface ListRelationships {
  list_items?: {
    data: JsonApiResourceId[];
  };
}

export interface ListResource {
  type: "list";
  id: string;
  attributes: ListAttributes;
  relationships?: ListRelationships;
}

// List Item types
export interface ListItemAttributes {
  label: string;
  status: "pending" | "completed";
  section: string | null;
  position: number | null;
  created_at: string | null;
}

export interface ListItemResource {
  type: "list_item";
  id: string;
  attributes: ListItemAttributes;
}

// Task Box Item types
export interface TaskBoxItemAttributes {
  id?: number | null;
  summary: string;
  emoji_icon: string | null;
  routine: boolean | null;
  reward_points: number | null;
}

export interface TaskBoxItemResource {
  type: "task_box_item";
  id: string;
  attributes: TaskBoxItemAttributes;
}

// Frame types
export interface FrameAttributes {
  [key: string]: unknown;
}

export interface FrameResource {
  type: "frame";
  id: string;
  attributes: FrameAttributes;
}

// Calendar types
export interface SourceCalendarAttributes {
  [key: string]: unknown;
}

export interface SourceCalendarResource {
  type: "source_calendar";
  id: string;
  attributes: SourceCalendarAttributes;
}

export interface CalendarEventAttributes {
  [key: string]: unknown;
}

export interface CalendarEventResource {
  type: "calendar_event";
  id: string;
  attributes: CalendarEventAttributes;
}

// Device types
export interface DeviceAttributes {
  [key: string]: unknown;
}

export interface DeviceResource {
  type: "device";
  id: string;
  attributes: DeviceAttributes;
}

// Reward types
export interface RewardAttributes {
  [key: string]: unknown;
}

export interface RewardResource {
  type: "reward";
  id: string;
  attributes: RewardAttributes;
}

export interface RewardPointAttributes {
  [key: string]: unknown;
}

export interface RewardPointResource {
  type: "reward_point";
  id: string;
  attributes: RewardPointAttributes;
}

// API Response types
export type ChoresResponse = JsonApiResponse<ChoreResource[], CategoryResource>;
export type ChoreResponse = JsonApiResponse<ChoreResource, CategoryResource>;
export type ListsResponse = JsonApiResponse<ListResource[]>;
export type ListResponse = JsonApiResponse<ListResource, ListItemResource>;
export type CategoriesResponse = JsonApiResponse<CategoryResource[]>;
export type DevicesResponse = JsonApiResponse<DeviceResource[]>;
export type FrameResponse = JsonApiResponse<FrameResource>;
export type SourceCalendarsResponse = JsonApiResponse<SourceCalendarResource[]>;
export type CalendarEventsResponse = JsonApiResponse<CalendarEventResource[], CategoryResource | SourceCalendarResource>;
export type TaskBoxItemResponse = JsonApiResponse<TaskBoxItemResource>;
export type RewardsResponse = JsonApiResponse<RewardResource[]>;
export type RewardPointsResponse = JsonApiResponse<RewardPointResource[]>;

// Request body types for creating resources
// Chore write body.
// NOTE: The Skylight API expects a FLAT JSON body for chore create/update
// (not a JSON:API { data: { attributes, relationships } } envelope), with the
// assignee passed as a numeric `category_id`.
export interface ChoreWriteBody {
  summary?: string;
  description?: string | null;
  start?: string;
  start_time?: string | null;
  status?: string;
  recurring?: boolean;
  // One or more RRULE strings. Routines must use exactly one BYHOUR of 6, 14, or 20.
  recurrence_set?: string[] | null;
  reward_points?: number | null;
  emoji_icon?: string | null;
  routine?: boolean;
  category_id?: number | null;
}

export type CreateChoreRequest = ChoreWriteBody;

// Like chores/rewards, task box and list writes use a flat JSON body, not a
// JSON:API envelope.
export type CreateTaskBoxItemRequest = Partial<TaskBoxItemAttributes>;

// List request types (flat body). `color` is required by the API on create.
export interface CreateListRequest {
  label: string;
  kind: "shopping" | "to_do";
  color: string;
}

export type UpdateListRequest = Partial<{
  label: string;
  kind: "shopping" | "to_do";
  color: string | null;
}>;

// List item request types (flat body)
export interface CreateListItemRequest {
  label: string;
  section?: string | null;
}

export type UpdateListItemRequest = Partial<{
  label: string;
  status: "pending" | "completed";
  section: string | null;
  position: number | null;
}>;

export type ListItemResponse = JsonApiResponse<ListItemResource>;

// Calendar event request types
export interface CreateCalendarEventRequest {
  summary: string;
  starts_at: string;
  ends_at: string;
  all_day?: boolean;
  description?: string;
  location?: string;
  category_ids?: string[];
  calendar_account_id?: string;
  calendar_id?: string;
  rrule?: string[] | null;
  timezone?: string;
  countdown_enabled?: boolean;
  kind?: string;
}

export interface UpdateCalendarEventRequest {
  summary?: string;
  starts_at?: string;
  ends_at?: string;
  all_day?: boolean;
  description?: string;
  location?: string;
  category_ids?: string[];
  rrule?: string[] | null;
  timezone?: string;
  countdown_enabled?: boolean;
}

export type CalendarEventResponse = JsonApiResponse<CalendarEventResource>;

// Chore update request type
export type UpdateChoreRequest = ChoreWriteBody;

// Reward write body.
// NOTE: Like chores, the Skylight API expects a FLAT JSON body for reward
// create/update, with assignees passed as a numeric `category_ids` array.
export interface RewardWriteBody {
  name?: string;
  description?: string | null;
  emoji_icon?: string | null;
  point_value?: number;
  respawn_on_redemption?: boolean;
  category_ids?: number[];
}

export type CreateRewardRequest = RewardWriteBody;
export type UpdateRewardRequest = RewardWriteBody;

export type RewardResponse = JsonApiResponse<RewardResource>;
