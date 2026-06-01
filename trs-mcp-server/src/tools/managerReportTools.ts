import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { identityLabel } from "../config.js";
import {
  getTeamMissingEntriesFromTrs,
  getTeamUtilizationFromTrs
} from "../trsApiClient.js";
import type {
  MissingEntriesReportResponse,
  UtilizationReportResponse
} from "../types.js";
import { isValidIsoDate } from "../utils/dateUtils.js";
import { getAxiosErrorMessage } from "../utils/errorUtils.js";

const reportDateRangeSchema = {
  startDate: z.string().describe("Start date in YYYY-MM-DD format."),
  endDate: z.string().describe("End date in YYYY-MM-DD format."),
  employeeName: z.string().optional().describe("Optional employee name filter, such as Bijaya Tiwari.")
};

export function registerManagerReportTools(server: McpServer): void {
  server.registerTool(
    "get_team_utilization",
    {
      title: "Get Team Utilization Report",
      description:
        "Manager/Admin tool that shows team utilization for a date range. Use when a manager or admin asks about utilization, logged hours vs expected hours, low utilization, team capacity, monthly utilization, or employee utilization.",
      inputSchema: reportDateRangeSchema
    },
    async ({ startDate, endDate, employeeName }) => {
      const dateValidationError = validateDateRange(startDate, endDate);
      if (dateValidationError) return errorResult(dateValidationError);

      try {
        const report = await getTeamUtilizationFromTrs(startDate, endDate);
        const filteredReport = filterByEmployeeName(report, employeeName);

        if (filteredReport.length === 0) {
          return {
            content: [{
              type: "text",
              text: employeeName
                ? `No utilization data found for ${employeeName} from ${startDate} to ${endDate}.`
                : `No utilization data found from ${startDate} to ${endDate}.`
            }]
          };
        }

        return {
          content: [{
            type: "text",
            text: formatUtilizationReport(filteredReport, startDate, endDate, employeeName)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Could not retrieve team utilization. Backend message: ${getAxiosErrorMessage(error)}`
          }],
          isError: true
        };
      }
    }
  );

  server.registerTool(
    "get_team_missing_entries",
    {
      title: "Get Team Missing Time Entries",
      description:
        "Manager/Admin tool that shows employees with missing time-entry work logs for a date range. Use when a manager or admin asks who missed work logs, missing entries, absent timesheets, incomplete timesheets, or a specific employee's missing logs.",
      inputSchema: reportDateRangeSchema
    },
    async ({ startDate, endDate, employeeName }) => {
      const dateValidationError = validateDateRange(startDate, endDate);
      if (dateValidationError) return errorResult(dateValidationError);

      try {
        const report = await getTeamMissingEntriesFromTrs(startDate, endDate);
        const filteredReport = filterByEmployeeName(report, employeeName);

        if (filteredReport.length === 0) {
          return {
            content: [{
              type: "text",
              text: employeeName
                ? `No missing time entries found for ${employeeName} from ${startDate} to ${endDate}.`
                : `No missing time entries found from ${startDate} to ${endDate}.`
            }]
          };
        }

        return {
          content: [{
            type: "text",
            text: formatMissingEntriesReport(filteredReport, startDate, endDate, employeeName)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Could not retrieve missing time entries. Backend message: ${getAxiosErrorMessage(error)}`
          }],
          isError: true
        };
      }
    }
  );
}

function validateDateRange(startDate: string, endDate: string): string | undefined {
  if (!isValidIsoDate(startDate)) {
    return `Invalid startDate: ${startDate}. Please use YYYY-MM-DD format.`;
  }

  if (!isValidIsoDate(endDate)) {
    return `Invalid endDate: ${endDate}. Please use YYYY-MM-DD format.`;
  }

  if (startDate > endDate) {
    return `Invalid date range: startDate ${startDate} is after endDate ${endDate}.`;
  }

  return undefined;
}

function filterByEmployeeName<T extends { fullName: string }>(
  report: T[],
  employeeName?: string
): T[] {
  if (!employeeName?.trim()) return report;

  const normalizedSearch = normalize(employeeName);
  return report.filter((row) => normalize(row.fullName).includes(normalizedSearch));
}

function formatUtilizationReport(
  report: UtilizationReportResponse[],
  startDate: string,
  endDate: string,
  employeeName?: string
): string {
  const sortedReport = [...report].sort((a, b) => a.utilizationPercent - b.utilizationPercent);

  const lines = sortedReport.map((row) => {
    return [
      row.fullName.padEnd(18),
      String(row.totalHours).padStart(7),
      String(row.expectedHours).padStart(8),
      `${row.utilizationPercent}%`.padStart(8)
    ].join(" | ");
  });

  return [
    `Configured identity: ${identityLabel}`,
    employeeName
      ? `Team utilization for ${employeeName} from ${startDate} to ${endDate}:`
      : `Team utilization from ${startDate} to ${endDate}:`,
    "```text",
    "Employee           | Logged  | Expected | Util %",
    "-------------------|---------|----------|--------",
    ...lines,
    "```"
  ].join("\n");
}

function formatMissingEntriesReport(
  report: MissingEntriesReportResponse[],
  startDate: string,
  endDate: string,
  employeeName?: string
): string {
  const sortedReport = [...report].sort((a, b) => b.missingDates.length - a.missingDates.length);

  const lines = sortedReport.flatMap((row) => {
    const chunks = chunk(row.missingDates, 4);
    return chunks.map((dates, index) => {
      const name = index === 0 ? row.fullName.padEnd(18) : "".padEnd(18);
      const days = index === 0 ? String(row.missingDates.length).padStart(4) : "".padStart(4);
      return `${name} | ${days} | ${dates.join(", ")}`;
    });
  });

  return [
    `Configured identity: ${identityLabel}`,
    employeeName
      ? `Missing time entries for ${employeeName} from ${startDate} to ${endDate}:`
      : `Missing time entries from ${startDate} to ${endDate}:`,
    "```text",
    "Employee           | Days | Missing dates",
    "-------------------|------|------------------------------------------------",
    ...lines,
    "```"
  ].join("\n");
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function errorResult(text: string) {
  return { content: [{ type: "text" as const, text }], isError: true as const };
}