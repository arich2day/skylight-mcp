import { describe, it, expect } from "vitest";
import { buildRecurrenceSet } from "../src/tools/chores.js";

describe("buildRecurrenceSet", () => {
  it("returns undefined when neither recurring nor routine", () => {
    expect(buildRecurrenceSet({})).toBeUndefined();
    expect(buildRecurrenceSet({ recurring: false, routine: false })).toBeUndefined();
  });

  it("handles daily / weekly / weekdays", () => {
    expect(buildRecurrenceSet({ recurring: true, recurrencePattern: "daily" })).toEqual([
      "RRULE:FREQ=DAILY",
    ]);
    expect(buildRecurrenceSet({ recurring: true, recurrencePattern: "weekly" })).toEqual([
      "RRULE:FREQ=WEEKLY",
    ]);
    expect(buildRecurrenceSet({ recurring: true, recurrencePattern: "weekdays" })).toEqual([
      "RRULE:FREQ=WEEKLY;BYDAY=MO",
      "RRULE:FREQ=WEEKLY;BYDAY=TU",
      "RRULE:FREQ=WEEKLY;BYDAY=WE",
      "RRULE:FREQ=WEEKLY;BYDAY=TH",
      "RRULE:FREQ=WEEKLY;BYDAY=FR",
    ]);
  });

  it("defaults to daily when recurring with no pattern", () => {
    expect(buildRecurrenceSet({ recurring: true })).toEqual(["RRULE:FREQ=DAILY"]);
  });

  it("expands a day list into one weekly rule per day (codes and names)", () => {
    expect(buildRecurrenceSet({ recurring: true, recurrencePattern: "SU,WE" })).toEqual([
      "RRULE:FREQ=WEEKLY;BYDAY=SU",
      "RRULE:FREQ=WEEKLY;BYDAY=WE",
    ]);
    expect(buildRecurrenceSet({ recurring: true, recurrencePattern: "mon wed fri" })).toEqual([
      "RRULE:FREQ=WEEKLY;BYDAY=MO",
      "RRULE:FREQ=WEEKLY;BYDAY=WE",
      "RRULE:FREQ=WEEKLY;BYDAY=FR",
    ]);
  });

  it("splits a multi-day BYDAY RRULE into one rule per day (API rejects comma lists)", () => {
    expect(
      buildRecurrenceSet({ recurring: true, recurrencePattern: "RRULE:FREQ=WEEKLY;BYDAY=FR,SA" })
    ).toEqual([
      "RRULE:FREQ=WEEKLY;BYDAY=FR",
      "RRULE:FREQ=WEEKLY;BYDAY=SA",
    ]);
  });

  it("passes a single-day RRULE through unchanged", () => {
    expect(
      buildRecurrenceSet({ recurring: true, recurrencePattern: "RRULE:FREQ=WEEKLY;BYDAY=SA" })
    ).toEqual(["RRULE:FREQ=WEEKLY;BYDAY=SA"]);
  });

  it("builds routine anchors at valid BYHOUR slots (6/14/20)", () => {
    expect(buildRecurrenceSet({ routine: true, timeOfDay: "morning" })).toEqual([
      "RRULE:FREQ=DAILY;BYHOUR=6",
    ]);
    expect(buildRecurrenceSet({ routine: true, timeOfDay: "midday" })).toEqual([
      "RRULE:FREQ=DAILY;BYHOUR=14",
    ]);
    expect(buildRecurrenceSet({ routine: true, timeOfDay: "evening" })).toEqual([
      "RRULE:FREQ=DAILY;BYHOUR=20",
    ]);
  });

  it("defaults routines to the morning slot", () => {
    expect(buildRecurrenceSet({ routine: true })).toEqual(["RRULE:FREQ=DAILY;BYHOUR=6"]);
  });

  it("limits a routine to specific weekdays when given a day list", () => {
    expect(
      buildRecurrenceSet({ routine: true, timeOfDay: "evening", recurrencePattern: "SA,SU" })
    ).toEqual([
      "RRULE:FREQ=WEEKLY;BYHOUR=20;BYDAY=SA",
      "RRULE:FREQ=WEEKLY;BYHOUR=20;BYDAY=SU",
    ]);
  });
});
