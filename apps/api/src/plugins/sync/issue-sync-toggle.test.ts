import { describe, expect, it } from "vite-plus/test";
import { acceptsIssue, isIssueSyncDisabled } from "./rules";

describe("issue sync toggle", () => {
  it("stays on unless the config turns it off explicitly", () => {
    expect(isIssueSyncDisabled({})).toBe(false);
    expect(isIssueSyncDisabled(JSON.stringify({ issueSync: true }))).toBe(
      false,
    );
    expect(isIssueSyncDisabled("not json")).toBe(false);
    expect(isIssueSyncDisabled({ issueSync: false })).toBe(true);
  });

  it("admits no incoming issue while it is off, whatever the label rules say", () => {
    expect(acceptsIssue({}, [])).toBe(true);
    expect(acceptsIssue(JSON.stringify({ issueSync: false }), [])).toBe(false);
  });
});
