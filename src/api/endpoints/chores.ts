import { getClient } from "../client.js";
import type {
  ChoresResponse,
  ChoreResponse,
  ChoreResource,
  CategoryResource,
  CreateChoreRequest,
  UpdateChoreRequest,
} from "../types.js";

export interface GetChoresOptions {
  after?: string;
  before?: string;
  includeLate?: boolean;
  filterLinkedToProfile?: boolean;
}

export interface GetChoresResult {
  chores: ChoreResource[];
  categories: CategoryResource[];
}

/**
 * Get chores for a date range
 */
export async function getChores(options: GetChoresOptions = {}): Promise<GetChoresResult> {
  const client = getClient();
  const params: Record<string, string | boolean | undefined> = {
    after: options.after,
    before: options.before,
    include_late: options.includeLate,
  };

  if (options.filterLinkedToProfile) {
    params.filter = "linked_to_profile";
  }

  const response = await client.get<ChoresResponse>(
    "/api/frames/{frameId}/chores",
    params
  );

  return {
    chores: response.data,
    categories: response.included ?? [],
  };
}

export interface CreateChoreOptions {
  summary: string;
  start: string;
  startTime?: string;
  status?: string;
  recurring?: boolean;
  /** One or more RRULE strings. Routines must use exactly one BYHOUR of 6, 14, or 20. */
  recurrenceSet?: string[];
  categoryId?: string;
  rewardPoints?: number;
  emojiIcon?: string;
  routine?: boolean;
  description?: string;
}

/**
 * Create a new chore.
 * Sends a flat JSON body (not a JSON:API envelope) with a numeric `category_id`,
 * matching what the Skylight API expects.
 */
export async function createChore(options: CreateChoreOptions): Promise<ChoreResource> {
  const client = getClient();

  const request: CreateChoreRequest = {
    summary: options.summary,
    start: options.start,
    start_time: options.startTime ?? null,
    status: options.status ?? "pending",
    recurring: options.recurring ?? false,
    recurrence_set: options.recurrenceSet ?? null,
    reward_points: options.rewardPoints ?? null,
    emoji_icon: options.emojiIcon ?? null,
  };

  if (options.routine !== undefined) request.routine = options.routine;
  if (options.description !== undefined) request.description = options.description;
  if (options.categoryId) request.category_id = Number(options.categoryId);

  const response = await client.post<ChoreResponse>(
    "/api/frames/{frameId}/chores",
    request
  );

  return response.data;
}

export interface UpdateChoreOptions {
  summary?: string;
  start?: string;
  startTime?: string | null;
  status?: string;
  recurring?: boolean;
  recurrenceSet?: string[] | null;
  categoryId?: string | null;
  rewardPoints?: number | null;
  emojiIcon?: string | null;
  routine?: boolean;
  description?: string | null;
}

/**
 * Update an existing chore (flat JSON body, numeric `category_id`).
 */
export async function updateChore(
  choreId: string,
  options: UpdateChoreOptions
): Promise<ChoreResource> {
  const client = getClient();

  const request: UpdateChoreRequest = {};

  if (options.summary !== undefined) request.summary = options.summary;
  if (options.start !== undefined) request.start = options.start;
  if (options.startTime !== undefined) request.start_time = options.startTime;
  if (options.status !== undefined) request.status = options.status;
  if (options.recurring !== undefined) request.recurring = options.recurring;
  if (options.recurrenceSet !== undefined) request.recurrence_set = options.recurrenceSet;
  if (options.rewardPoints !== undefined) request.reward_points = options.rewardPoints;
  if (options.emojiIcon !== undefined) request.emoji_icon = options.emojiIcon;
  if (options.routine !== undefined) request.routine = options.routine;
  if (options.description !== undefined) request.description = options.description;
  if (options.categoryId !== undefined) {
    request.category_id = options.categoryId === null ? null : Number(options.categoryId);
  }

  const response = await client.request<ChoreResponse>(
    `/api/frames/{frameId}/chores/${choreId}`,
    { method: "PUT", body: request }
  );

  return response.data;
}

/** How a delete should apply to a recurring chore series. */
export type ChoreDeleteScope = "all" | "this" | "this_and_future";

/**
 * Delete a chore.
 * Recurring chores require an `apply_to` value; it is harmless for one-off chores,
 * so it always defaults to deleting the whole series.
 */
export async function deleteChore(
  choreId: string,
  applyTo: ChoreDeleteScope = "all"
): Promise<void> {
  const client = getClient();
  await client.request(`/api/frames/{frameId}/chores/${choreId}`, {
    method: "DELETE",
    params: { apply_to: applyTo },
  });
}
