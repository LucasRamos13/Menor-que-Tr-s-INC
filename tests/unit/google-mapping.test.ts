import { describe, expect, it } from "vitest";
import { reconcile, internalEventToGoogleEvent, googleEventToInternalEvent } from "@/services/calendar/google-mapping";

describe("reconcile", () => {
  const synced = {
    googleUpdatedAt: "2026-01-01T10:00:00.000Z",
    localUpdatedAt: "2026-01-01T10:00:00.000Z",
    lastSyncedGoogleUpdatedAt: "2026-01-01T10:00:00.000Z",
    lastSyncedLocalUpdatedAt: "2026-01-01T10:00:00.000Z",
  };

  it("does nothing when neither side changed", () => {
    expect(reconcile(synced)).toEqual({ type: "noop" });
  });

  it("pulls remote changes when only Google changed", () => {
    expect(reconcile({ ...synced, googleUpdatedAt: "2026-01-02T00:00:00.000Z" })).toEqual({ type: "apply_remote_to_local" });
  });

  it("pushes local changes when only the app changed", () => {
    expect(reconcile({ ...synced, localUpdatedAt: "2026-01-02T00:00:00.000Z" })).toEqual({ type: "apply_local_to_remote" });
  });

  it("mirrors a Google-side deletion when local did not change", () => {
    expect(reconcile({ ...synced, googleUpdatedAt: null })).toEqual({ type: "delete_local" });
  });

  it("recreates on Google when Google deleted but the app edited it since the last sync", () => {
    expect(reconcile({ ...synced, googleUpdatedAt: null, localUpdatedAt: "2026-01-02T00:00:00.000Z" })).toEqual({
      type: "recreate_remote_from_local",
      reason: "conflict",
    });
  });

  it("mirrors a local deletion when Google did not change", () => {
    expect(reconcile({ ...synced, localUpdatedAt: null })).toEqual({ type: "delete_remote" });
  });

  it("restores locally when the app deleted it but Google edited it since the last sync", () => {
    expect(reconcile({ ...synced, localUpdatedAt: null, googleUpdatedAt: "2026-01-02T00:00:00.000Z" })).toEqual({
      type: "recreate_local_from_remote",
      reason: "conflict",
    });
  });

  it("resolves a true conflict (both changed) in favor of whichever is newer — Google wins here", () => {
    const action = reconcile({
      ...synced,
      googleUpdatedAt: "2026-01-03T00:00:00.000Z",
      localUpdatedAt: "2026-01-02T00:00:00.000Z",
    });
    expect(action).toEqual({ type: "conflict_remote_wins" });
  });

  it("resolves a true conflict in favor of the app when its edit is newer", () => {
    const action = reconcile({
      ...synced,
      googleUpdatedAt: "2026-01-02T00:00:00.000Z",
      localUpdatedAt: "2026-01-03T00:00:00.000Z",
    });
    expect(action).toEqual({ type: "conflict_local_wins" });
  });

  it("treats a never-synced pair (both snapshots null) with matching current state as noop", () => {
    expect(
      reconcile({
        googleUpdatedAt: "2026-01-01T00:00:00.000Z",
        localUpdatedAt: "2026-01-01T00:00:00.000Z",
        lastSyncedGoogleUpdatedAt: null,
        lastSyncedLocalUpdatedAt: null,
      }),
    ).toEqual({ type: "conflict_remote_wins" });
  });
});

describe("event mapping round-trip", () => {
  it("maps a timed internal event to Google's dateTime format and back", () => {
    const internal = {
      title: "Jantar romântico",
      description: "Reserva às 20h",
      location: "Restaurante X",
      start_at: "2026-06-01T23:00:00.000Z",
      end_at: "2026-06-02T01:00:00.000Z",
      all_day: false,
    };
    const google = internalEventToGoogleEvent(internal);
    expect(google.start).toEqual({ dateTime: "2026-06-01T23:00:00.000Z" });
    expect(google.end).toEqual({ dateTime: "2026-06-02T01:00:00.000Z" });

    const roundTripped = googleEventToInternalEvent({ id: "g1", summary: internal.title, description: internal.description, location: internal.location, start: google.start!, end: google.end! });
    expect(roundTripped.start_at).toBe(internal.start_at);
    expect(roundTripped.end_at).toBe(internal.end_at);
    expect(roundTripped.all_day).toBe(false);
  });

  it("maps an all-day internal event to Google's exclusive end-date convention and back", () => {
    const internal = {
      title: "Casamento",
      description: null,
      location: null,
      start_at: "2026-12-12T00:00:00.000Z",
      end_at: "2026-12-12T00:00:00.000Z",
      all_day: true,
    };
    const google = internalEventToGoogleEvent(internal);
    // Google's all-day end date is exclusive: the day AFTER the last day.
    expect(google.start).toEqual({ date: "2026-12-12" });
    expect(google.end).toEqual({ date: "2026-12-13" });

    const roundTripped = googleEventToInternalEvent({ id: "g2", summary: internal.title, start: google.start!, end: google.end! });
    expect(roundTripped.start_at).toBe(internal.start_at);
    expect(roundTripped.end_at).toBe(internal.end_at);
    expect(roundTripped.all_day).toBe(true);
  });

  it("falls back to a placeholder title when Google's summary is empty", () => {
    const mapped = googleEventToInternalEvent({ id: "g3", summary: "", start: { date: "2026-01-01" }, end: { date: "2026-01-02" } });
    expect(mapped.title).toBe("(Sem título)");
  });
});
