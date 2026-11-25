/**
 * Helpers for the project tree view, where a task sits under its parents
 * rather than in a status group. They take the parent to children map from
 * `buildSubtaskChildren`, so they inherit its caveats: a task may have several
 * parents and the edges may form a cycle.
 */

/**
 * Tasks that are nobody's child within the given set, in input order.
 *
 * A task whose only parents sit in a cycle is not reachable from any such
 * task, so it would vanish from the tree. Those are appended as extra roots,
 * one per unreached group, so every task stays reachable from the top.
 */
export function findTreeRoots<T extends { id: string }>(
  tasks: readonly T[],
  children: Map<string, string[]>,
): T[] {
  const ids = new Set(tasks.map((task) => task.id));
  const hasParent = new Set<string>();
  for (const [parentId, childIds] of children) {
    if (!ids.has(parentId)) continue;
    for (const childId of childIds) {
      if (childId !== parentId && ids.has(childId)) hasParent.add(childId);
    }
  }

  const roots = tasks.filter((task) => !hasParent.has(task.id));

  const reached = new Set<string>();
  const reach = (id: string) => {
    const stack = [id];
    while (stack.length > 0) {
      const current = stack.pop() as string;
      if (reached.has(current)) continue;
      reached.add(current);
      for (const childId of children.get(current) ?? []) {
        if (ids.has(childId)) stack.push(childId);
      }
    }
  };
  for (const root of roots) reach(root.id);

  for (const task of tasks) {
    if (reached.has(task.id)) continue;
    roots.push(task);
    reach(task.id);
  }

  return roots;
}

export type DescendantProgress = { done: number; total: number };

/**
 * Completed and total counts over every distinct task below each parent, not
 * just its direct children, so an epic shows how much of its whole subtree is
 * finished. A task reached through two paths is counted once.
 */
export function computeDescendantProgress(
  taskIds: Iterable<string>,
  children: Map<string, string[]>,
  isDone: (taskId: string) => boolean,
  isKnown: (taskId: string) => boolean,
): Map<string, DescendantProgress> {
  const progress = new Map<string, DescendantProgress>();

  for (const taskId of taskIds) {
    if (!children.has(taskId)) continue;

    const seen = new Set<string>([taskId]);
    const stack = [...(children.get(taskId) ?? [])];
    let done = 0;
    let total = 0;
    while (stack.length > 0) {
      const current = stack.pop() as string;
      if (seen.has(current) || !isKnown(current)) continue;
      seen.add(current);
      total += 1;
      if (isDone(current)) done += 1;
      stack.push(...(children.get(current) ?? []));
    }

    if (total > 0) progress.set(taskId, { done, total });
  }

  return progress;
}

/**
 * The tasks to keep when a filter is active: the matches and every ancestor
 * of a match, so a matching subtask is still shown in its place.
 */
export function withAncestors(
  matchIds: ReadonlySet<string>,
  children: Map<string, string[]>,
): Set<string> {
  const parents = new Map<string, string[]>();
  for (const [parentId, childIds] of children) {
    for (const childId of childIds) {
      const existing = parents.get(childId);
      if (existing) existing.push(parentId);
      else parents.set(childId, [parentId]);
    }
  }

  const kept = new Set<string>();
  const stack = [...matchIds];
  while (stack.length > 0) {
    const current = stack.pop() as string;
    if (kept.has(current)) continue;
    kept.add(current);
    stack.push(...(parents.get(current) ?? []));
  }
  return kept;
}
