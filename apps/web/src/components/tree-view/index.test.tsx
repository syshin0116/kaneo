import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vite-plus/test";
import type { ProjectWithTasks } from "@/types/project";
import type Task from "@/types/task";
import { TreeView } from "./index";

const m = vi.hoisted(() => ({
  relations: {
    data: [] as unknown[],
    isLoading: false,
    isError: false,
  },
}));

vi.mock("@/hooks/queries/task-relation/use-get-project-task-relations", () => ({
  default: () => ({ ...m.relations, refetch: vi.fn() }),
}));
vi.mock("@/hooks/use-task-hover-prefetch", () => ({
  useTaskHoverPrefetch: () => ({}),
}));
// The row body renders chips that read stores and queries; the tree only
// decides which rows exist and where, so the title stands in for it.
vi.mock("@/components/list-view/task-row-body", () => ({
  TaskRowBody: ({ task }: { task: Task }) => <span>{task.title}</span>,
}));

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

const task = (id: string, status = "to-do"): Task =>
  ({ id, title: id, number: 1, status, projectId: "p" }) as Task;

const edge = (sourceTaskId: string, targetTaskId: string) => ({
  sourceTaskId,
  targetTaskId,
  relationType: "subtask",
});

const project = {
  id: "p",
  slug: "P",
  columns: [
    { id: "c1", slug: "to-do", isFinal: false, tasks: [] },
    { id: "c2", slug: "done", isFinal: true, tasks: [] },
  ],
} as unknown as ProjectWithTasks;

const tasks = [
  task("story"),
  task("epic"),
  task("leaf-done", "done"),
  task("leaf-open"),
];

function renderTree(matchIds: ReadonlySet<string> | null = null) {
  m.relations.data = [
    edge("epic", "story"),
    edge("story", "leaf-done"),
    edge("story", "leaf-open"),
  ];
  const onOpenTask = vi.fn();
  render(
    <TreeView
      project={project}
      workspaceId="w"
      tasks={tasks}
      matchIds={matchIds}
      onOpenTask={onOpenTask}
    />,
  );
  return { onOpenTask };
}

it("starts from the roots, shows subtree progress and expands on demand", () => {
  renderTree();

  expect(screen.getByText("epic")).toBeTruthy();
  expect(screen.queryByText("story")).toBeNull();
  expect(screen.getByText("1/3")).toBeTruthy();

  // The only collapsed toggle on screen is the epic's.
  fireEvent.click(screen.getByRole("button", { expanded: false }));
  expect(screen.getByText("story")).toBeTruthy();
  expect(screen.getByText("1/2")).toBeTruthy();
});

it("keeps the path to a filtered match open and dims the context rows", () => {
  renderTree(new Set(["leaf-open"]));

  expect(screen.getByText("epic")).toBeTruthy();
  expect(screen.getByText("story")).toBeTruthy();
  expect(screen.getByText("leaf-open")).toBeTruthy();
  expect(screen.queryByText("leaf-done")).toBeNull();
});

it("opens a task from its row", () => {
  const { onOpenTask } = renderTree();

  fireEvent.click(screen.getByText("epic"));
  expect(onOpenTask).toHaveBeenCalledWith("epic");
});
