import { describe, it, expect } from "vitest";
import { fuzzyScore, matchQuery } from "../../src/backend/modules/search/fuzzyMatch";

describe("fuzzyScore", () => {
  it("matches a non-contiguous subsequence", () => {
    expect(fuzzyScore("src/services/getProfile.ts", "gpf")).not.toBeNull();
  });

  it("rejects when q isn't a subsequence of path", () => {
    expect(fuzzyScore("src/services/getProfile.ts", "xyz")).toBeNull();
  });

  it("is case-insensitive", () => {
    expect(fuzzyScore("README.md", "readme")).not.toBeNull();
  });

  it("empty query matches everything with score 0", () => {
    expect(fuzzyScore("anything.ts", "")).toBe(0);
  });

  it("ranks a contiguous exact match above a scattered match", () => {
    const exact = fuzzyScore("src/getProfile.ts", "getProfile");
    const scattered = fuzzyScore("src/g_e_t_P_r_o_f_i_l_e.ts", "getProfile");
    expect(exact).not.toBeNull();
    expect(scattered).not.toBeNull();
    expect(exact! > scattered!).toBe(true);
  });

  it("ranks a match starting at a path/word boundary above a mid-word match", () => {
    const boundary = fuzzyScore("src/profile/index.ts", "prof");
    const midWord = fuzzyScore("src/xxprofile/index.ts", "prof");
    expect(boundary).not.toBeNull();
    expect(midWord).not.toBeNull();
    expect(boundary! > midWord!).toBe(true);
  });

  it("ranks a camelCase-boundary match above a mid-word match", () => {
    const camel = fuzzyScore("getUserProfile.ts", "up");
    const midWord = fuzzyScore("supine.ts", "up");
    expect(camel).not.toBeNull();
    expect(midWord).not.toBeNull();
    expect(camel! > midWord!).toBe(true);
  });
});

describe("matchQuery", () => {
  it("matches a multi-word query against a path with no literal space", () => {
    expect(matchQuery("apps/site/.dev.vars.example", "dev exam")).not.toBeNull();
  });

  it("requires every word to match, regardless of order", () => {
    expect(matchQuery("docker-compose.dev.yml", "yml dev")).not.toBeNull();
  });

  it("rejects when any single word doesn't match", () => {
    expect(matchQuery("docker-compose.dev.yml", "dev zzz")).toBeNull();
  });

  it("empty/whitespace-only query matches everything with score 0", () => {
    expect(matchQuery("anything.ts", "   ")).toBe(0);
  });
});
