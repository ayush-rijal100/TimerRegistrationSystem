"use strict";
// Insight Skill combines multiple read-only reports into manager-friendly signals.
// This is where the harness starts moving from "show raw tool output" toward
// "explain what deserves attention" while still staying deterministic and auditable.
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildManagerInsight = buildManagerInsight;
exports.formatNumber = formatNumber;
exports.buildManagerRecommendations = buildManagerRecommendations;
exports.applyRecommendationMemory = applyRecommendationMemory;
const LOW_UTILIZATION_THRESHOLD = 50;
function buildManagerInsight(missingReport, utilizationReport) {
    const utilizationByUserId = new Map();
    for (const utilization of utilizationReport) {
        utilizationByUserId.set(utilization.userId, utilization);
    }
    const insights = utilizationReport.map((utilization) => {
        const missing = missingReport.find((item) => item.userId === utilization.userId);
        const missingDays = missing?.missingDates.length ?? 0;
        const reasons = [];
        if (missingDays > 0) {
            reasons.push(`${missingDays} missing work-log day${missingDays === 1 ? "" : "s"}`);
        }
        if (utilization.utilizationPercent < LOW_UTILIZATION_THRESHOLD) {
            reasons.push(`${formatNumber(utilization.utilizationPercent)}% utilization`);
        }
        return {
            userId: utilization.userId,
            fullName: utilization.fullName,
            missingDays,
            totalHours: utilization.totalHours,
            expectedHours: utilization.expectedHours,
            utilizationPercent: utilization.utilizationPercent,
            attentionScore: calculateAttentionScore(missingDays, utilization.utilizationPercent),
            reasons
        };
    });
    // Include employees who appear only in the missing report.
    // This keeps the insight robust if a user has missing entries but no utilization row.
    for (const missing of missingReport) {
        if (utilizationByUserId.has(missing.userId)) {
            continue;
        }
        const missingDays = missing.missingDates.length;
        insights.push({
            userId: missing.userId,
            fullName: missing.fullName,
            missingDays,
            totalHours: 0,
            expectedHours: 0,
            utilizationPercent: 0,
            attentionScore: calculateAttentionScore(missingDays, 0),
            reasons: [`${missingDays} missing work-log day${missingDays === 1 ? "" : "s"}`]
        });
    }
    const attentionAreas = insights
        .filter((item) => item.reasons.length > 0)
        .sort((a, b) => b.attentionScore - a.attentionScore)
        .slice(0, 5);
    const highestMissingEmployee = [...insights]
        .sort((a, b) => b.missingDays - a.missingDays)[0];
    const lowestUtilizationEmployee = [...insights]
        .filter((item) => item.expectedHours > 0)
        .sort((a, b) => a.utilizationPercent - b.utilizationPercent)[0];
    return {
        totalEmployeesWithMissingEntries: missingReport.length,
        totalEmployeesBelowTargetUtilization: insights.filter((item) => item.expectedHours > 0 && item.utilizationPercent < LOW_UTILIZATION_THRESHOLD).length,
        highestMissingEmployee,
        lowestUtilizationEmployee,
        attentionAreas
    };
}
function calculateAttentionScore(missingDays, utilizationPercent) {
    const missingScore = missingDays * 3;
    const utilizationGap = Math.max(0, LOW_UTILIZATION_THRESHOLD - utilizationPercent);
    return missingScore + utilizationGap;
}
function formatNumber(value) {
    return Number(value).toFixed(2).replace(/\.00$/, "").replace(/0$/, "");
}
function buildManagerRecommendations(insight) {
    const recommendations = [];
    // Phase 21: Recommendations are derived from existing insight signals.
    // They are intentionally advisory only; they do not send reminders or mutate TRS data.
    for (const area of insight.attentionAreas.slice(0, 5)) {
        if (area.missingDays > 0 &&
            area.expectedHours > 0 &&
            area.utilizationPercent < LOW_UTILIZATION_THRESHOLD) {
            recommendations.push({
                priority: recommendations.length + 1,
                message: `Follow up with ${area.fullName}: ${area.missingDays} missing work-log days and ${formatNumber(area.utilizationPercent)}% utilization.`,
                employeeName: area.fullName,
                missingDays: area.missingDays,
                utilizationPercent: area.utilizationPercent,
                categories: ["MISSING_LOGS", "LOW_UTILIZATION"]
            });
            continue;
        }
        if (area.missingDays > 0) {
            recommendations.push({
                priority: recommendations.length + 1,
                message: `Ask ${area.fullName} to complete ${area.missingDays} missing work-log day${area.missingDays === 1 ? "" : "s"}.`,
                employeeName: area.fullName,
                missingDays: area.missingDays,
                utilizationPercent: area.expectedHours > 0 ? area.utilizationPercent : undefined,
                categories: ["MISSING_LOGS"]
            });
            continue;
        }
        if (area.utilizationPercent < LOW_UTILIZATION_THRESHOLD) {
            recommendations.push({
                priority: recommendations.length + 1,
                message: `Review workload/context for ${area.fullName}; utilization is ${formatNumber(area.utilizationPercent)}%.`,
                employeeName: area.fullName,
                utilizationPercent: area.utilizationPercent,
                categories: ["LOW_UTILIZATION"]
            });
        }
    }
    if (insight.totalEmployeesWithMissingEntries > 0) {
        recommendations.push({
            priority: recommendations.length + 1,
            message: "Ask the team to complete missing logs before monthly close.",
            categories: ["TEAM_PROCESS", "MISSING_LOGS"]
        });
    }
    if (insight.totalEmployeesBelowTargetUtilization > 0) {
        recommendations.push({
            priority: recommendations.length + 1,
            message: "Review whether low utilization is caused by missing logs, project assignment gaps, leave, or workload imbalance.",
            categories: ["TEAM_PROCESS", "LOW_UTILIZATION"]
        });
    }
    return { recommendations };
}
// Phase 23: Apply learned recommendation memory as process guidance.
// This does not claim external systems were checked. It only changes wording based
// on manager feedback stored locally in recommendation memory.
function applyRecommendationMemory(recommendations, memories) {
    if (memories.length === 0) {
        return recommendations;
    }
    return {
        recommendations: recommendations.recommendations.map((recommendation) => {
            const matchedMemories = memories.filter((memory) => recommendationMatchesMemory(recommendation, memory));
            if (matchedMemories.length === 0) {
                return recommendation;
            }
            return {
                ...recommendation,
                message: applyMemoryGuidanceToMessage(recommendation, matchedMemories)
            };
        })
    };
}
function recommendationMatchesMemory(recommendation, memory) {
    const memoryText = normalize(memory.text);
    const employeeName = recommendation.employeeName
        ? normalize(recommendation.employeeName)
        : "";
    const employeeFirstName = employeeName.split(" ")[0] ?? "";
    const employeeMatches = employeeName.length > 0 &&
        (memoryText.includes(employeeName) || memoryText.includes(employeeFirstName));
    // Phase 23.5: Respect memory scope.
    // If a memory says "for Ashish", it is employee-specific and must not leak
    // into Bijaya/Ram/team recommendations just because it also mentions missing logs.
    if (isEmployeeScopedMemory(memoryText)) {
        return employeeMatches && categoryMatchesMemory(recommendation, memoryText);
    }
    return categoryMatchesMemory(recommendation, memoryText);
}
function categoryMatchesMemory(recommendation, memoryText) {
    const missingLogsMatch = recommendation.categories.includes("MISSING_LOGS") &&
        includesAny(memoryText, ["missing", "log", "logs", "work log", "work logs"]);
    const utilizationMatch = recommendation.categories.includes("LOW_UTILIZATION") &&
        includesAny(memoryText, ["utilization", "utilisation", "underutilized", "low hours"]);
    const teamProcessMatch = recommendation.categories.includes("TEAM_PROCESS") &&
        includesAny(memoryText, ["team", "monthly close", "process", "everyone"]);
    return missingLogsMatch || utilizationMatch || teamProcessMatch;
}
function isEmployeeScopedMemory(memoryText) {
    return /\b(for|about|regarding)\s+[a-z]+/.test(memoryText);
}
function applyMemoryGuidanceToMessage(recommendation, memories) {
    const guidance = buildGuidanceText(recommendation, memories);
    if (!guidance) {
        return recommendation.message;
    }
    return `${recommendation.message} ${guidance}`;
}
function buildGuidanceText(recommendation, memories) {
    const combinedMemoryText = normalize(memories.map((memory) => memory.text).join(" "));
    if (recommendation.categories.includes("MISSING_LOGS") &&
        includesAny(combinedMemoryText, ["leave", "absence", "calendar"])) {
        return "Based on remembered feedback, verify known leave/absence context before follow-up.";
    }
    if (recommendation.categories.includes("LOW_UTILIZATION") &&
        includesAny(combinedMemoryText, ["project assignment", "assignment", "workload", "context"])) {
        return "Based on remembered feedback, verify assignment/workload context before follow-up.";
    }
    return "Based on remembered feedback, review the relevant context before follow-up.";
}
function includesAny(value, keywords) {
    return keywords.some((keyword) => value.includes(keyword));
}
function normalize(value) {
    return value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}
