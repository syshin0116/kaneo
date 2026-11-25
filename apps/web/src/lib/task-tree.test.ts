import { describe, expect, it } from "vite-plus/test";
import {
  computeDescendantProgress,
  findTreeRoots,
  withAncestors,
} from "./task-tree";

const tasks = (...ids: string[]) => ids.map((id) => ({ id }));
const ids = (list: { id: string }[]) => list.map((task) => task.id);

describe("findTreeRoots", () => {
  it("keeps only tasks without a parent in the project, in input order", () => {
    const children = new Map([
      ["epic", ["story"]],
      ["story", ["leaf"]],
    ]);

    expect(
      ids(findTreeRoots(tasks("leaf", "other", "epic", "story"), children)),
    ).toEqual(["other", "epic"]);
  });

  it("treats a task as a root when its parent is outside the project", () => {
    const children = new Map([["elsewhere", ["child"]]]);

    expect(ids(findTreeRoots(tasks("child"), children))).toEqual(["child"]);
  });

  it("adds one root per cycle that no root reaches", () => {
    const children = new Map([
      ["a", ["b"]],
      ["b", ["a"]],
      ["c", ["d"]],
    ]);

    expect(ids(findTreeRoots(tasks("a", "b", "c", "d"), children))).toEqual([
      "c",
      "a",
    ]);
  });
});

describe("computeDescendantProgress", () => {
  const children = new Map([
    ["epic", ["story", "shared"]],
    ["story", ["leaf", "shared"]],
  ]);
  const done = new Set(["leaf", "shared"]);
  const known = new Set(["epic", "story", "leaf", "shared"]);

  it("counts every distinct task below a parent once", () => {
    const progress = computeDescendantProgress(
      known,
      children,
      (id) => done.has(id),
      (id) => known.has(id),
    );

    expect(progress.get("epic")).toEqual({ done: 2, total: 3 });
    expect(progress.get("story")).toEqual({ done: 2, total: 2 });
    expect(progress.has("leaf")).toBe(false);
  });

  it("ignores children the view does not have", () => {
    const progress = computeDescendantProgress(
      ["story"],
      new Map([["story", ["missing"]]]),
      () => false,
      (id) => id === "story",
    );

    expect(progress.has("story")).toBe(false);
  });

  it("terminates on a cycle", () => {
    const progress = computeDescendantProgress(
      ["a"],
      new Map([
        ["a", ["b"]],
        ["b", ["a"]],
      ]),
      () => false,
      () => true,
    );

    expect(progress.get("a")).toEqual({ done: 0, total: 1 });
  });
});

describe("withAncestors", () => {
  it("keeps the matches and every path above them", () => {
    const children = new Map([
      ["epic", ["story", "other"]],
      ["story", ["leaf"]],
      ["second-parent", ["leaf"]],
    ]);

    expect([...withAncestors(new Set(["leaf"]), children)].sort()).toEqual([
      "epic",
      "leaf",
      "second-parent",
      "story",
    ]);
  });
});
