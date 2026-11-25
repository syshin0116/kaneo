import { ChevronRight } from "lucide-react";
import { memo } from "react";
import { useTranslation } from "react-i18next";
import { TaskRowBody } from "@/components/list-view/task-row-body";
import { useTaskHoverPrefetch } from "@/hooks/use-task-hover-prefetch";
import { cn } from "@/lib/cn";
import { getColumnIcon } from "@/lib/column";
import type { DescendantProgress } from "@/lib/task-tree";
import type Task from "@/types/task";

type TreeRowProps = {
  task: Task;
  rowId: string;
  depth: number;
  childCount: number;
  isExpanded: boolean;
  /** Shown but dimmed: kept only because a filtered match sits below it. */
  isContext: boolean;
  status: { slug: string; isFinal: boolean; icon?: string | null } | undefined;
  progress: DescendantProgress | undefined;
  projectSlug: string | undefined;
  workspaceId: string;
  onToggle: (rowId: string) => void;
  onOpen: (taskId: string) => void;
};

function TreeRow({
  task,
  rowId,
  depth,
  childCount,
  isExpanded,
  isContext,
  status,
  progress,
  projectSlug,
  workspaceId,
  onToggle,
  onOpen,
}: TreeRowProps) {
  const { t } = useTranslation();
  const hoverPrefetch = useTaskHoverPrefetch(task.id);

  return (
    <div
      className={cn(
        "group/row flex items-stretch border-b border-border/50 hover:bg-accent/60",
        isContext && "opacity-55",
      )}
    >
      <div className="flex shrink-0 items-center pl-3.5">
        <span
          aria-hidden="true"
          className="shrink-0"
          // Capped so a deep chain cannot push the title off the row.
          style={{ width: `${Math.min(depth, 8) * 1.25}rem` }}
        />
        {childCount > 0 ? (
          <button
            type="button"
            onClick={() => onToggle(rowId)}
            aria-expanded={isExpanded}
            aria-label={
              isExpanded
                ? t("tasks:listView.collapseSubtasks", { title: task.title })
                : t("tasks:listView.expandSubtasks", { title: task.title })
            }
            className="touch-hitbox relative shrink-0 rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <ChevronRight
              className={cn(
                "size-3 transition-transform duration-150 ease-out",
                isExpanded && "rotate-90",
              )}
            />
          </button>
        ) : (
          <span aria-hidden="true" className="w-5 shrink-0" />
        )}
      </div>

      <div
        role="button"
        tabIndex={0}
        data-task-id={task.id}
        data-task-row-id={rowId}
        onClick={() => onOpen(task.id)}
        onKeyDown={(event) => {
          if (event.target !== event.currentTarget) return;
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onOpen(task.id);
          }
        }}
        {...hoverPrefetch}
        className="group relative flex h-10 min-w-0 flex-1 cursor-pointer items-center gap-3 pr-3.5 pl-2 outline-none focus-visible:ring-1 focus-visible:ring-board-card-focus focus-visible:ring-inset"
      >
        {depth > 0 && (
          // The indent is decorative, so nesting is otherwise inaudible.
          <span className="sr-only">
            {t("tasks:listView.subtaskLevel", { level: depth })}
          </span>
        )}
        <span className="shrink-0" title={status?.slug ?? task.status}>
          {getColumnIcon(
            status?.slug ?? task.status,
            status?.isFinal,
            status?.icon,
          )}
        </span>
        <TaskRowBody
          task={task}
          projectSlug={projectSlug}
          workspaceId={workspaceId}
          isCompleted={status?.isFinal ?? false}
          assigneeName={task.assigneeName}
          assigneeImage={task.assigneeImage}
        />
        {progress && (
          <span
            className="shrink-0 font-mono text-muted-foreground text-xs tabular-nums"
            title={t("tasks:treeView.progress", progress)}
          >
            {progress.done}/{progress.total}
          </span>
        )}
      </div>
    </div>
  );
}

export default memo(TreeRow);
