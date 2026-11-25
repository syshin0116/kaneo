/**
 * Browser-local, per-project record of which rows are expanded in a view.
 * Each view keeps its own record: the tree view starts from roots rather than
 * status groups, so its row ids differ from the list view's.
 *
 * This is a convenience rather than state the app depends on: a value that
 * cannot be read or written simply leaves every row collapsed.
 */
export type ExpandedRowsView = "list-view" | "tree-view";

export function expandedRowsStorageKey(
  projectId: string,
  view: ExpandedRowsView = "list-view",
) {
  return `kaneo:${view}:expanded-subtasks:${projectId}`;
}

export function readExpandedRows(
  projectId: string,
  view: ExpandedRowsView = "list-view",
): Record<string, boolean> {
  try {
    const stored = localStorage.getItem(
      expandedRowsStorageKey(projectId, view),
    );
    if (!stored) return {};

    // A cast would let a stale or hand-edited value through: "null" parses
    // fine and then throws on the first property read, blanking the list.
    const parsed: unknown = JSON.parse(stored);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      return {};
    }

    const rows: Record<string, boolean> = {};
    for (const [rowId, value] of Object.entries(parsed)) {
      if (value === true) rows[rowId] = true;
    }
    return rows;
  } catch {
    return {};
  }
}

export function writeExpandedRows(
  projectId: string,
  rows: Record<string, boolean>,
  view: ExpandedRowsView = "list-view",
) {
  try {
    // Only expanded rows are kept, and an empty map removes the key, so a
    // project the viewer has collapsed everything in leaves nothing behind.
    const expanded = Object.fromEntries(
      Object.entries(rows).filter(([, value]) => value === true),
    );
    if (Object.keys(expanded).length === 0) {
      localStorage.removeItem(expandedRowsStorageKey(projectId, view));
    } else {
      localStorage.setItem(
        expandedRowsStorageKey(projectId, view),
        JSON.stringify(expanded),
      );
    }
  } catch {
    // A private window or blocked site data only costs the restore.
  }
}
