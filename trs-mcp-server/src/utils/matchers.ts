import type { ProjectResponse, UserProjectAssignmentResponse, UserResponse } from "../types.js";

export function normalizeSearchText(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "").trim();
}

export function findMatchingProject(projects: ProjectResponse[], projectReference: string): ProjectResponse | undefined {
  const normalizedReference = normalizeSearchText(projectReference);
  return projects.find((project) => {
    const projectText = normalizeSearchText(`${project.projectCode} ${project.projectName}`);
    return projectText.includes(normalizedReference) || normalizedReference.includes(projectText);
  });
}

export function findMatchingUser(users: UserResponse[], userReference: string): UserResponse | undefined {
  const normalizedReference = normalizeSearchText(userReference);
  return users.find((user) => {
    const userText = normalizeSearchText(`${user.fullName} ${user.email}`);
    return userText.includes(normalizedReference) || normalizedReference.includes(userText);
  });
}

export function findExistingAssignment(
  assignments: UserProjectAssignmentResponse[],
  userId: number,
  projectId: number
): UserProjectAssignmentResponse | undefined {
  return assignments.find((assignment) => assignment.userId === userId && assignment.projectId === projectId);
}
