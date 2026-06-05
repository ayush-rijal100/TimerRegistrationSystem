"use strict";
// TRS Adapter is the bridge between the harness and Spring Boot.
// The harness should not know raw endpoint details; it asks this adapter
// for TRS data, and the adapter handles URLs, headers, params, and tokens.
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCurrentUser = getCurrentUser;
exports.getMyProjects = getMyProjects;
exports.getAdminProjects = getAdminProjects;
exports.getAdminUsers = getAdminUsers;
exports.getProjectAssignments = getProjectAssignments;
exports.createProject = createProject;
exports.assignUserToProject = assignUserToProject;
exports.getMissingEntriesReport = getMissingEntriesReport;
exports.getUtilizationReport = getUtilizationReport;
const axios_1 = __importDefault(require("axios"));
const config_js_1 = require("../config.js");
function botRequestConfig() {
    return {
        headers: {
            "X-Bot-Service-Token": config_js_1.config.trsBotServiceToken
        },
        params: {
            provider: config_js_1.config.externalProvider,
            providerUserId: config_js_1.config.externalProviderUserId
        }
    };
}
// Phase 2: Resolve external identity into the real mapped TRS user.
// Example: CLAUDE_DESKTOP + admin-local -> Admin One.
async function getCurrentUser() {
    const response = await axios_1.default.get(`${config_js_1.config.trsApiBaseUrl}/api/bot/identity/resolve`, botRequestConfig());
    return response.data;
}
// Phase 4: First real read-only skill tool.
// This asks Spring Boot for projects assigned to the mapped TRS user.
async function getMyProjects() {
    const response = await axios_1.default.get(`${config_js_1.config.trsApiBaseUrl}/api/bot/projects/my`, botRequestConfig());
    return response.data;
}
// Phase 10: Admin read-only tool.
// This asks Spring Boot for all TRS projects. The backend verifies that the
// mapped external identity has ADMIN role before returning data.
async function getAdminProjects() {
    const response = await axios_1.default.get(`${config_js_1.config.trsApiBaseUrl}/api/bot/admin/projects`, botRequestConfig());
    return response.data;
}
// Phase 11: Admin read-only user list tool.
// Spring Boot validates that the mapped external identity has ADMIN role.
async function getAdminUsers() {
    const response = await axios_1.default.get(`${config_js_1.config.trsApiBaseUrl}/api/bot/admin/users`, botRequestConfig());
    return response.data;
}
// Phase 12: Admin read-only project assignment list.
// This returns which users are assigned to which projects.
async function getProjectAssignments() {
    const response = await axios_1.default.get(`${config_js_1.config.trsApiBaseUrl}/api/bot/admin/user-projects`, botRequestConfig());
    return response.data;
}
// Phase 7: First write-action tool.
// This still goes through Spring Boot, which validates bot token, external identity,
// and ADMIN role before creating the project.
async function createProject(request) {
    const response = await axios_1.default.post(`${config_js_1.config.trsApiBaseUrl}/api/bot/admin/projects`, request, botRequestConfig());
    return response.data;
}
// Phase 13: Admin write-action tool for assigning a user to a project.
// The harness prepares a draft first; this function is called only after confirmation.
async function assignUserToProject(request) {
    const response = await axios_1.default.post(`${config_js_1.config.trsApiBaseUrl}/api/bot/admin/user-projects`, request, botRequestConfig());
    return response.data;
}
// Phase 17: Manager/Admin read-only report tool.
// Spring Boot validates the external identity role before returning missing entries.
async function getMissingEntriesReport(startDate, endDate) {
    const response = await axios_1.default.get(`${config_js_1.config.trsApiBaseUrl}/api/bot/reports/missing-entries`, {
        ...botRequestConfig(),
        params: {
            ...botRequestConfig().params,
            startDate,
            endDate
        }
    });
    return response.data;
}
// Phase 19: Manager/Admin read-only utilization report tool.
// Spring Boot validates MANAGER/ADMIN role using the mapped external identity.
async function getUtilizationReport(startDate, endDate) {
    const response = await axios_1.default.get(`${config_js_1.config.trsApiBaseUrl}/api/bot/reports/utilization`, {
        ...botRequestConfig(),
        params: {
            ...botRequestConfig().params,
            startDate,
            endDate
        }
    });
    return response.data;
}
