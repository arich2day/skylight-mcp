# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed

- **Chores & rewards create/update**: The Skylight API expects a flat JSON body
  (not a JSON:API `{ data: { attributes, relationships } }` envelope). Chores now
  send a numeric `category_id` and rewards a numeric `category_ids` array, fixing
  `"Category is required."` / `"Category ids is required."` 422 errors.
- **Recurrence**: `recurrence_set` is now sent (and typed) as an array of RRULE
  strings. Previously a single string was silently saved as non-recurring. Multi-day
  schedules are expanded to one rule per day because the API rejects a comma-separated
  `BYDAY` list.
- **Chore deletion**: Recurring chores now send the required `apply_to` value
  (`all` / `this` / `this_and_future`), and empty delete responses no longer throw.
- **Lists & task box**: `create_list`, `update_list`, `create_list_item`,
  `update_list_item`, and `create_task` now send flat JSON bodies (they previously
  sent JSON:API envelopes the API rejected). List creation now defaults to a valid
  palette color, since the API requires one.
- **Auth errors**: A version-gated login (`/api/sessions`) now reports the real
  server message and points to token auth, instead of a misleading
  "invalid email or password".

### Added

- **Routines**: `create_chore` supports `routine` + `timeOfDay`
  (morning=6am / midday=2pm / evening=8pm) to create native Skylight routines, plus a
  `description` field for sub-task details.
- `create_chore` accepts day lists (e.g. `"SU,WE"`, `"mon wed fri"`) for recurrence.

## [1.1.7] - 2025-12-30

### Fixed

- **Authentication**: Fixed email/password authentication to use correct `Basic base64(userId:token)` format instead of `Bearer token`. The Skylight API requires the user ID and token to be combined and base64-encoded for Basic auth.
- **Calendar Events**: Fixed `get_calendar_events` returning no events when querying a single day. The API treats `date_max` as exclusive, so we now add 1 day to ensure events on the end date are included.

### Changed

- Added debug logging for authentication flow to help troubleshoot login issues
- Added automatic retry on 401 errors for email/password auth (attempts re-login once before failing)

## [1.1.6] - 2025-12-29

- Initial public release
