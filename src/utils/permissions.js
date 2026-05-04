export const ROLES = {
  ADMIN: "ADMIN",
  MEMBER: "MEMBER",
};

export const isAdmin = (user) => user?.role === ROLES.ADMIN;

export const isMember = (user) => user?.role === ROLES.MEMBER;

export const canCreateProject = (user) => isAdmin(user);

export const canCreateTask = (user) => isAdmin(user);

export const canAssignTask = (user) => isAdmin(user);

/**
 * A user can edit a task's status if:
 *  - They are an ADMIN (full control), OR
 *  - They are a MEMBER and the task is assigned to them
 */
export const canEditTaskStatus = (user, task) => {
  if (!user || !task) return false;
  if (isAdmin(user)) return true;
  return isMember(user) && task.assigneeId === user.id;
};

export const canDeleteTask = (user) => isAdmin(user);

export const canDeleteProject = (user) => isAdmin(user);

/**
 * Returns the list of statuses a user is allowed to set.
 * ADMIN  → all three statuses
 * MEMBER → all three statuses (Firebase rules already validate TODO | IN_PROGRESS | DONE)
 *           Members are simply restricted to their own assigned tasks via canEditTaskStatus.
 */
export const getAllowedTaskStatuses = (user) => {
  if (isAdmin(user) || isMember(user)) {
    return ["TODO", "IN_PROGRESS", "DONE"];
  }
  return [];
};
