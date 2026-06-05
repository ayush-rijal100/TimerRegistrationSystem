"use strict";
// Phase 31: Tool Result Verification Layer.
// This layer checks that backend/tool responses still match what the harness
// expects before we format or reason over them.
//
// Why this matters:
// - The AI planner may choose a tool correctly.
// - The backend may still return an unexpected shape because of API drift,
//   a bug, auth issue, or partial response.
// - The harness should catch that cleanly before producing confusing output.
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyAdminProjectsResponse = verifyAdminProjectsResponse;
exports.verifyAdminUsersResponse = verifyAdminUsersResponse;
exports.verifyUtilizationReportResponse = verifyUtilizationReportResponse;
exports.verifyMissingEntriesReportResponse = verifyMissingEntriesReportResponse;
function isRecord(value) {
    return typeof value === "object" && value !== null;
}
function verifyArray(value, toolName) {
    if (!Array.isArray(value)) {
        return {
            ok: false,
            toolName,
            reason: "Expected the backend response to be an array."
        };
    }
    return { ok: true };
}
function verifyStringField(item, fieldName, toolName, itemIndex) {
    if (typeof item[fieldName] !== "string") {
        return {
            ok: false,
            toolName,
            itemIndex,
            reason: `Expected field "${fieldName}" to be a string.`
        };
    }
    return { ok: true };
}
function verifyNumberField(item, fieldName, toolName, itemIndex) {
    if (typeof item[fieldName] !== "number") {
        return {
            ok: false,
            toolName,
            itemIndex,
            reason: `Expected field "${fieldName}" to be a number.`
        };
    }
    return { ok: true };
}
function verifyBooleanField(item, fieldName, toolName, itemIndex) {
    if (typeof item[fieldName] !== "boolean") {
        return {
            ok: false,
            toolName,
            itemIndex,
            reason: `Expected field "${fieldName}" to be a boolean.`
        };
    }
    return { ok: true };
}
function firstFailure(checks) {
    return checks.find((check) => !check.ok) ?? { ok: true };
}
function verifyAdminProjectsResponse(value) {
    const arrayCheck = verifyArray(value, "getAdminProjects");
    if (!arrayCheck.ok) {
        return arrayCheck;
    }
    const projects = value;
    for (let index = 0; index < projects.length; index++) {
        const item = projects[index];
        if (!isRecord(item)) {
            return {
                ok: false,
                toolName: "getAdminProjects",
                itemIndex: index,
                reason: "Expected each project item to be an object."
            };
        }
        const check = firstFailure([
            verifyNumberField(item, "id", "getAdminProjects", index),
            verifyStringField(item, "projectCode", "getAdminProjects", index),
            verifyStringField(item, "projectName", "getAdminProjects", index),
            verifyBooleanField(item, "active", "getAdminProjects", index)
        ]);
        if (!check.ok) {
            return check;
        }
    }
    return { ok: true };
}
function verifyAdminUsersResponse(value) {
    const arrayCheck = verifyArray(value, "getAdminUsers");
    if (!arrayCheck.ok) {
        return arrayCheck;
    }
    const users = value;
    for (let index = 0; index < users.length; index++) {
        const item = users[index];
        if (!isRecord(item)) {
            return {
                ok: false,
                toolName: "getAdminUsers",
                itemIndex: index,
                reason: "Expected each user item to be an object."
            };
        }
        const check = firstFailure([
            verifyNumberField(item, "id", "getAdminUsers", index),
            verifyStringField(item, "fullName", "getAdminUsers", index),
            verifyStringField(item, "email", "getAdminUsers", index),
            verifyStringField(item, "role", "getAdminUsers", index),
            verifyBooleanField(item, "active", "getAdminUsers", index)
        ]);
        if (!check.ok) {
            return check;
        }
    }
    return { ok: true };
}
function verifyUtilizationReportResponse(value) {
    const arrayCheck = verifyArray(value, "getUtilizationReport");
    if (!arrayCheck.ok) {
        return arrayCheck;
    }
    const report = value;
    for (let index = 0; index < report.length; index++) {
        const item = report[index];
        if (!isRecord(item)) {
            return {
                ok: false,
                toolName: "getUtilizationReport",
                itemIndex: index,
                reason: "Expected each utilization item to be an object."
            };
        }
        const check = firstFailure([
            verifyNumberField(item, "userId", "getUtilizationReport", index),
            verifyStringField(item, "fullName", "getUtilizationReport", index),
            verifyNumberField(item, "totalHours", "getUtilizationReport", index),
            verifyNumberField(item, "expectedHours", "getUtilizationReport", index),
            verifyNumberField(item, "utilizationPercent", "getUtilizationReport", index)
        ]);
        if (!check.ok) {
            return check;
        }
    }
    return { ok: true };
}
function verifyMissingEntriesReportResponse(value) {
    const arrayCheck = verifyArray(value, "getMissingEntriesReport");
    if (!arrayCheck.ok) {
        return arrayCheck;
    }
    const report = value;
    for (let index = 0; index < report.length; index++) {
        const item = report[index];
        if (!isRecord(item)) {
            return {
                ok: false,
                toolName: "getMissingEntriesReport",
                itemIndex: index,
                reason: "Expected each missing-entry item to be an object."
            };
        }
        const missingDates = item["missingDates"];
        if (!Array.isArray(missingDates)) {
            return {
                ok: false,
                toolName: "getMissingEntriesReport",
                itemIndex: index,
                reason: "Expected field \"missingDates\" to be an array."
            };
        }
        const invalidDateIndex = missingDates.findIndex((date) => typeof date !== "string");
        if (invalidDateIndex !== -1) {
            return {
                ok: false,
                toolName: "getMissingEntriesReport",
                itemIndex: index,
                reason: `Expected missingDates[${invalidDateIndex}] to be a string.`
            };
        }
        const check = firstFailure([
            verifyNumberField(item, "userId", "getMissingEntriesReport", index),
            verifyStringField(item, "fullName", "getMissingEntriesReport", index)
        ]);
        if (!check.ok) {
            return check;
        }
    }
    return { ok: true };
}
