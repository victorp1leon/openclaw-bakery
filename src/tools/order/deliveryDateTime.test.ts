import { describe, expect, it } from "vitest";

import { isCanonicalDeliveryDateTime, normalizeDeliveryDateTime } from "./deliveryDateTime";

describe("normalizeDeliveryDateTime", () => {
  const timezone = "America/Mexico_City";
  const now = new Date("2026-03-07T12:00:00.000Z");

  it("normalizes relative date and time in spanish", () => {
    const iso = normalizeDeliveryDateTime({
      value: "hoy, a las 6pm",
      timezone,
      now
    });

    expect(iso).toBe("2026-03-07T18:00:00");
  });

  it("normalizes tomorrow shorthand", () => {
    const iso = normalizeDeliveryDateTime({
      value: "manana 2pm",
      timezone,
      now
    });

    expect(iso).toBe("2026-03-08T14:00:00");
  });

  it("normalizes explicit local datetime format", () => {
    const iso = normalizeDeliveryDateTime({
      value: "2026-03-10 09:30",
      timezone,
      now
    });

    expect(iso).toBe("2026-03-10T09:30:00");
  });

  it("falls back to parseable iso instant", () => {
    const iso = normalizeDeliveryDateTime({
      value: "2026-03-04T17:30:00.000Z",
      timezone,
      now
    });

    expect(iso).toBe("2026-03-04T17:30:00");
  });

  it("returns undefined when no date can be inferred", () => {
    const iso = normalizeDeliveryDateTime({
      value: "en la tarde",
      timezone,
      now
    });

    expect(iso).toBeUndefined();
  });

  it("normalizes pasado manana shorthand", () => {
    const iso = normalizeDeliveryDateTime({
      value: "pasado mañana 5pm",
      timezone,
      now
    });

    expect(iso).toBe("2026-03-09T17:00:00");
  });

  it("normalizes weekday phrases", () => {
    const iso = normalizeDeliveryDateTime({
      value: "para el viernes 4pm",
      timezone,
      now
    });

    expect(iso).toBe("2026-03-13T16:00:00");
  });

  it("requires time when strict mode is enabled", () => {
    const iso = normalizeDeliveryDateTime({
      value: "mañana",
      timezone,
      now,
      requireTime: true
    });

    expect(iso).toBeUndefined();
  });

  it("accepts canonical local datetime strings as-is", () => {
    const iso = normalizeDeliveryDateTime({
      value: "2026-03-12T16:30:00",
      timezone,
      now,
      requireTime: true
    });

    expect(iso).toBe("2026-03-12T16:30:00");
    expect(isCanonicalDeliveryDateTime("2026-03-12T16:30:00")).toBe(true);
  });
});
