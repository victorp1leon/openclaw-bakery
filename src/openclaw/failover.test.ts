import { afterEach, describe, expect, it } from "vitest";

import { isStrictSoftfailEnabled, isTransientOpenClawError } from "./failover";

describe("openclaw failover classification", () => {
  afterEach(() => {
    delete process.env.OPENCLAW_STRICT_SOFTFAIL;
  });

  it("classifies timeout/rate-limit style failures as transient", () => {
    expect(isTransientOpenClawError("request timed out")).toBe(true);
    expect(isTransientOpenClawError("rate limit reached")).toBe(true);
  });

  it("does not classify non-transient failures as transient", () => {
    expect(isTransientOpenClawError("invalid json payload")).toBe(false);
    expect(isTransientOpenClawError("invalid auth token")).toBe(false);
  });

  it("reads strict softfail flag from env", () => {
    process.env.OPENCLAW_STRICT_SOFTFAIL = "1";
    expect(isStrictSoftfailEnabled()).toBe(true);

    process.env.OPENCLAW_STRICT_SOFTFAIL = "0";
    expect(isStrictSoftfailEnabled()).toBe(false);
  });
});

