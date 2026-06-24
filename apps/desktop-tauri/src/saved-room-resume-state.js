export function selectSavedInviteRoomResumeRoom(priorityEntries = []) {
  return (
    (Array.isArray(priorityEntries) ? priorityEntries : [])
      .filter(({ priority }) => priority > 0)
      .sort((left, right) => {
        const priority = right.priority - left.priority;
        return priority || right.updatedAt - left.updatedAt || left.index - right.index;
      })[0]?.room ?? null
  );
}
