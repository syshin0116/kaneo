import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import ProjectLayout from "@/components/common/project-layout";
import PageTitle from "@/components/page-title";
import { DisplaySection } from "@/components/project/display/display-section";
import { ActiveFiltersBar } from "@/components/project/task-filters/active-filters-bar";
import { ProjectToolbar } from "@/components/project/toolbar/project-toolbar";
import { scopeTasks } from "@/components/project/toolbar/scope-tasks";
import { TaskCount } from "@/components/project/toolbar/task-count";
import { useProjectTaskView } from "@/components/project/toolbar/use-project-task-view";
import { LayoutSwitch } from "@/components/project/views/layout-switch";
import TaskDetailsSheet from "@/components/task/task-details-sheet";
import { TreeView } from "@/components/tree-view";
import { useGetTasks } from "@/hooks/queries/task/use-get-tasks";

type TreeSearchParams = {
  taskId?: string;
};

export const Route = createFileRoute(
  "/_layout/_authenticated/dashboard/workspace/$workspaceId/project/$projectId/tree",
)({
  component: RouteComponent,
  validateSearch: (search: Record<string, unknown>): TreeSearchParams => ({
    taskId: typeof search.taskId === "string" ? search.taskId : undefined,
  }),
});

function RouteComponent() {
  const { t } = useTranslation();
  const { projectId, workspaceId } = Route.useParams();
  const { taskId } = Route.useSearch();
  const navigate = useNavigate();
  const { data: project } = useGetTasks(projectId);
  // Planned tasks are included: an epic's backlog children are part of what
  // is left to do under it.
  const view = useProjectTaskView({
    project,
    projectId,
    workspaceId,
    scope: "schedule",
  });

  const tasks = useMemo(() => scopeTasks(project, "schedule"), [project]);
  const matchIds = useMemo(() => {
    const matches = scopeTasks(view.filters.filteredProject, "schedule");
    return matches.length === tasks.length
      ? null
      : new Set(matches.map((task) => task.id));
  }, [view.filters.filteredProject, tasks.length]);

  const openTask = useCallback(
    (id: string) =>
      navigate({
        to: ".",
        search: { taskId: id },
        replace: true,
      }),
    [navigate],
  );

  return (
    <ProjectLayout
      projectId={projectId}
      workspaceId={workspaceId}
      activeView="tree"
      toolbar={
        <ProjectToolbar
          view={view}
          display={
            <DisplaySection>
              <LayoutSwitch
                workspaceId={workspaceId}
                projectId={projectId}
                currentRoute="tree"
                currentView="tree"
              />
            </DisplaySection>
          }
        />
      }
      summary={
        <TaskCount
          shown={matchIds ? matchIds.size : tasks.length}
          total={tasks.length}
        />
      }
      filterBar={
        <ActiveFiltersBar
          subjects={view.subjects}
          onClear={view.filters.clearFilters}
          customFieldValues={view.filters.customFieldValues}
        />
      }
    >
      <PageTitle
        title={
          project
            ? t("tasks:treeView.pageTitle", { name: project.name })
            : undefined
        }
      />
      <div className="flex h-full min-h-0 flex-col bg-background">
        <h1 className="sr-only">{t("tasks:treeView.title")}</h1>
        {project && (
          <TreeView
            project={project}
            workspaceId={workspaceId}
            tasks={tasks}
            matchIds={matchIds}
            onOpenTask={openTask}
          />
        )}
        <TaskDetailsSheet
          taskId={taskId}
          projectId={projectId}
          workspaceId={workspaceId}
          onClose={() =>
            navigate({
              to: ".",
              search: {},
              replace: true,
            })
          }
        />
      </div>
    </ProjectLayout>
  );
}
