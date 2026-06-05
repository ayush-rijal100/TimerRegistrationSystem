"use strict";
// Date Range Skill converts common reporting phrases into backend-ready dates.
// This is intentionally deterministic for the MVP so reports are testable and safe.
// Later, an AI planner can extract richer date ranges and pass them into this same shape.
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractDateRange = extractDateRange;
const MONTHS = {
    january: 1,
    jan: 1,
    february: 2,
    feb: 2,
    march: 3,
    mar: 3,
    april: 4,
    apr: 4,
    may: 5,
    june: 6,
    jun: 6,
    july: 7,
    jul: 7,
    august: 8,
    aug: 8,
    september: 9,
    sep: 9,
    sept: 9,
    october: 10,
    oct: 10,
    november: 11,
    nov: 11,
    december: 12,
    dec: 12
};
function extractDateRange(userMessage, today = new Date()) {
    const normalized = userMessage.toLowerCase();
    // Handles phrases like "May 2026", "of month april 2026", or "for january".
    const explicitMonth = findExplicitMonth(normalized, today.getFullYear());
    if (explicitMonth) {
        return explicitMonth;
    }
    if (normalized.includes("previous month") || normalized.includes("last month")) {
        const previousMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        return monthRange(previousMonthDate.getFullYear(), previousMonthDate.getMonth() + 1);
    }
    if (normalized.includes("this month") || normalized.includes("current month")) {
        return monthRange(today.getFullYear(), today.getMonth() + 1);
    }
    return null;
}
function findExplicitMonth(message, defaultYear) {
    for (const [monthName, monthNumber] of Object.entries(MONTHS)) {
        const monthRegex = new RegExp(`\\b${monthName}\\b(?:\\s+(\\d{4}))?`, "i");
        const match = message.match(monthRegex);
        if (match) {
            const year = match[1] ? Number(match[1]) : defaultYear;
            return monthRange(year, monthNumber);
        }
    }
    return null;
}
function monthRange(year, month) {
    const startDate = `${year}-${pad2(month)}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${pad2(month)}-${pad2(lastDay)}`;
    return {
        startDate,
        endDate,
        label: `${monthName(month)} ${year}`
    };
}
function monthName(month) {
    return [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December"
    ][month - 1];
}
function pad2(value) {
    return String(value).padStart(2, "0");
}
