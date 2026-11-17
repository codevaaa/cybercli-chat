/** Cancel tasks whose only approval/control surface is the closing window. */
export function cancelTasksForOwner<Owner>(
  owners: Map<string, Owner>,
  owner: Owner,
  cancelTask: (taskId: string) => void,
): string[] {
  const ownedTaskIds = [...owners].filter(([, taskOwner]) => taskOwner === owner).map(([taskId]) => taskId)
  for (const taskId of ownedTaskIds) {
    try {
      cancelTask(taskId)
    } catch {
      // Continue releasing ownership for the remaining tasks while the window closes.
    }
    owners.delete(taskId)
  }
  return ownedTaskIds
}
