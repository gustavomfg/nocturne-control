import { describe, expect, it } from "vitest";
import { hashForSlug, slugFromHash } from "./routing";
import { experiments, findExperiment } from "../experiments/registry";

describe("routing", () => {
  it("reads the experiment slug from the hash in both forms", () => {
    expect(slugFromHash("#/entity-001")).toBe("entity-001");
    expect(slugFromHash("#entity-001")).toBe("entity-001");
    expect(slugFromHash("")).toBe("");
  });

  it("builds hashes that round-trip", () => {
    expect(slugFromHash(hashForSlug("entity-001"))).toBe("entity-001");
  });
});

describe("experiment registry", () => {
  it("has unique slugs and index codes, and resolves each slug", () => {
    const slugs = experiments.map((item) => item.slug);
    const codes = experiments.map((item) => item.code);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(new Set(codes).size).toBe(codes.length);
    for (const item of experiments) expect(findExperiment(item.slug)).toBe(item);
  });
});
