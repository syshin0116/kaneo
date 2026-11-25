import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import useGetProjectTaskRelations from "@/hooks/queries/task-relation/use-get-project-task-relations";
import {
  readExpandedRows,
  writeExpandedRows,
} from "@/lib/expanded-rows-storage";
import { buildSubtaskChildren, flattenSubtaskRows } from "@/lib/subtask-tree";
import {
  computeDescendantProgress,
  findTreeRoots,
  withAncestors,
} from "@/lib/task-tree";
import type { ProjectWithTasks } from "@/types/project";
import type Task from "@/types/task";
import TreeRow from "./tree-row";

type TreeViewProps = {
  project: ProjectWithTasks;
  workspaceId: string;
  /** Every task the view covers, before filtering. */
  tasks: readonly Task[];
  /** Ids that pass the toolbar filters, or null when no filter is active. */
  matchIds: ReadonlySet<string> | null;
  onOpenTask: (taskId: string) => void;
};

export function TreeView({
  project,
  workspaceId,
  tasks,
  matchIds,
  onOpenTask,
}: TreeViewProps) {
  const { t } = useTranslation();
  const {
    data: relations,
    isLoading: relationsLoading,
    isError: relationsFailed,
    refetch: refetchRelations,
  } = useGetProjectTaskRelations(project.id);

  const children = useMemo(
    () => buildSubtaskChildren(relations ?? []),
    [relations],
  );

  const statusBySlug = useMemo(
    () => new Map(project.columns.map((column) => [column.slug, column])),
    [project.columns],
  );
  const isDone = useCallback(
    (task: Task | undefined) =>
      task
        ? (statusBySlug.get(task.status)?.isFinal ??
          (task.status === "done" || task.status === "archived"))
        : false,
    [statusBySlug],
  );

  const allById = useMemo(
    () => new Map(tasks.map((task) => [task.id, task])),
    [tasks],
  );

  // Progress covers the whole subtree, not only what the filter leaves, so an
  // epic reads the same however the view is narrowed.
  const progress = useMemo(
    () =>
      computeDescendantProgress(
        allById.keys(),
        children,
        (id) => isDone(allById.get(id)),
        (id) => allById.has(id),
      ),
    [allById, children, isDone],
  );

  const keptIds = useMemo(
    () => (matchIds ? withAncestors(matchIds, children) : null),
    [matchIds, children],
  );
  const shownTasks = useMemo(
    () => (keptIds ? tasks.filter((task) => keptIds.has(task.id)) : tasks),
    [tasks, keptIds],
  );
  const shownById = useMemo(
    () => new Map(shownTasks.map((task) => [task.id, task])),
    [shownTasks],
  );
  const roots = useMemo(
    () => findTreeRoots(shownTasks, children),
    [shownTasks, children],
  );

  const [expanded, setExpanded] = useState(() => ({
    projectId: project.id,
    rows: readExpandedRows(project.id, "tree-view"),
  }));
  if (expanded.projectId !== project.id) {
    setExpanded({
      projectId: project.id,
      rows: readExpandedRows(project.id, "tree-view"),
    });
  }
  useEffect(() => {
    writeExpandedRows(expanded.projectId, expanded.rows, "tree-view");
  }, [expanded]);

  // While filtering every kept row starts open, since a match deep in the
  // tree would be useless behind a collapsed path. Collapsing one then is
  // remembered only until the filter changes, and never saved.
  const filtering = keptIds !== null;
  const [filterCollapsed, setFilterCollapsed] = useState(() => ({
    keptIds,
    rows: {} as Record<string, boolean>,
  }));
  if (filterCollapsed.keptIds !== keptIds) {
    setFilterCollapsed({ keptIds, rows: {} });
  }

  const toggle = useCallback(
    (rowId: string) => {
      const flip = <S extends { rows: Record<string, boolean> }>(
        previous: S,
      ): S => {
        const rows = { ...previous.rows };
        if (rows[rowId]) delete rows[rowId];
        else rows[rowId] = true;
        return { ...previous, rows };
      };
      if (filtering) setFilterCollapsed(flip);
      else setExpanded(flip);
    },
    [filtering],
  );

  const rows = useMemo(
    () =>
      flattenSubtaskRows({
        tasks: roots,
        children,
        tasksById: shownById,
        isExpanded: (rowId) =>
          filtering ? !filterCollapsed.rows[rowId] : !!expanded.rows[rowId],
      }),
    [
      roots,
      children,
      shownById,
      filtering,
      filterCollapsed.rows,
      expanded.rows,
    ],
  );

  const expandAll = () => {
    const all = flattenSubtaskRows({
      tasks: roots,
      children,
      tasksById: shownById,
      isExpanded: () => true,
    });
    setExpanded((previous) => ({
      ...previous,
      rows: Object.fromEntries(
        all.filter((row) => row.childCount > 0).map((row) => [row.rowId, true]),
      ),
    }));
  };
  const collapseAll = () =>
    setExpanded((previous) => ({ ...previous, rows: {} }));

  if (relationsLoading) {
    return (
      <p className="px-4 py-6 text-muted-foreground text-sm">
        {t("common:empty.loading")}
      </p>
    );
  }

  if (relationsFailed) {
    return (
      <div className="flex flex-col items-start gap-2 px-4 py-6">
        <p className="text-muted-foreground text-sm">
          {t("tasks:treeView.relationsLoadError")}
        </p>
        <Button variant="outline" size="xs" onClick={() => refetchRelations()}>
          {t("tasks:treeView.retry")}
        </Button>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <h2 className="font-semibold text-foreground text-sm">
          {matchIds
            ? t("tasks:treeView.noTasksFound")
            : t("tasks:treeView.noTasks")}
        </h2>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-1 border-b border-border/80 px-3 py-1.5">
        <Button
          variant="ghost"
          size="xs"
          onClick={expandAll}
          disabled={filtering}
        >
          {t("tasks:treeView.expandAll")}
        </Button>
        <Button
          variant="ghost"
          size="xs"
          onClick={collapseAll}
          disabled={filtering}
        >
          {t("tasks:treeView.collapseAll")}
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        {rows.map((row) => (
          <TreeRow
            key={row.rowId}
            task={row.task}
            rowId={row.rowId}
            depth={row.depth}
            childCount={row.childCount}
            isExpanded={row.isExpanded}
            isContext={matchIds !== null && !matchIds.has(row.task.id)}
            status={statusBySlug.get(row.task.status)}
            progress={progress.get(row.task.id)}
            projectSlug={project.slug}
            workspaceId={workspaceId}
            onToggle={toggle}
            onOpen={onOpenTask}
          />
        ))}
      </div>
    </div>
  );
}
