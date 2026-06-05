"use strict";
// Assignment Resolver validates extracted text against real backend data.
// This is the safety bridge between natural language and a database mutation.
// The skill may extract "Bijaya" or "Client project", but this resolver decides
// whether those references map confidently to exactly one TRS user/project.
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveAssignmentDraft = resolveAssignmentDraft;
function resolveAssignmentDraft(userReference, projectReference, users, projects) {
    const userMatches = matchUsers(userReference, users);
    if (userMatches.length === 0) {
        return {
            status: "USER_NOT_FOUND",
            userReference
        };
    }
    if (userMatches.length > 1) {
        return {
            status: "USER_AMBIGUOUS",
            userReference,
            matches: userMatches
        };
    }
    const projectMatches = matchProjects(projectReference, projects);
    if (projectMatches.length === 0) {
        return {
            status: "PROJECT_NOT_FOUND",
            projectReference
        };
    }
    if (projectMatches.length > 1) {
        return {
            status: "PROJECT_AMBIGUOUS",
            projectReference,
            matches: projectMatches
        };
    }
    const user = userMatches[0];
    const project = projectMatches[0];
    return {
        status: "RESOLVED",
        draft: {
            userId: user.id,
            projectId: project.id,
            userName: user.fullName,
            userEmail: user.email,
            projectCode: project.projectCode,
            projectName: project.projectName
        }
    };
}
function matchUsers(reference, users) {
    const normalizedReference = normalize(reference);
    return users.filter((user) => {
        const id = String(user.id);
        const name = normalize(user.fullName);
        const email = normalize(user.email);
        return (normalizedReference === id ||
            name === normalizedReference ||
            email === normalizedReference ||
            name.includes(normalizedReference) ||
            email.includes(normalizedReference));
    });
}
function matchProjects(reference, projects) {
    const normalizedReference = normalize(reference);
    return projects.filter((project) => {
        const id = String(project.id);
        const code = normalize(project.projectCode);
        const name = normalize(project.projectName);
        return (normalizedReference === id ||
            code === normalizedReference ||
            name === normalizedReference ||
            code.includes(normalizedReference) ||
            name.includes(normalizedReference));
    });
}
function normalize(value) {
    return value
        .toLowerCase()
        .replace(/[^a-z0-9@.]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}
