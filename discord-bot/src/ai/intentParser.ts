import OpenAI from "openai";
import { config } from "../config";
import { ConnectedActionName, connectedActions, formatConnectedActionsForPrompt } from "../actions/actionRegistry";
import { ConversationMessage } from "./conversationStore";
import { MAX_INTENT_HISTORY_MESSAGES } from "./memoryPolicy";

export type AiIntentName = ConnectedActionName | "UNKNOWN";

export type AiDateRange = {
  startDate: string;
  endDate: string;
  label: string;
};

export type ProjectStatusFilter = "ACTIVE" | "INACTIVE" | "ALL";
export type ProjectSortBy = "CREATED_AT" | "PROJECT_CODE" | "PROJECT_NAME";
export type ProjectSortDirection = "ASC" | "DESC";

export type AiIntentResult = {
  intent: AiIntentName;
  confidence: number;
  needsClarification?: boolean;
  clarificationQuestion?: string;
  dateRange?: AiDateRange;
  projectReference?: string;
  employeeReference?: string;
  projectCode?: string;
  projectName?: string;
  projectStatusFilter?: ProjectStatusFilter;
  projectSortBy?: ProjectSortBy;
  projectSortDirection?: ProjectSortDirection;
  fullName?: string;
  email?: string;
  password?: string;
  role?: "EMPLOYEE" | "MANAGER" | "ADMIN";
  hours?: number;
  notes?: string;
};

const client = new OpenAI({
  apiKey: config.openRouterApiKey || "missing-key",
  baseURL: config.openRouterBaseUrl
});

const connectedActionNames = new Set<string>(connectedActions.map((action) => action.name));
const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;

function isValidIsoDate(value: unknown): value is string {
  if (typeof value !== "string" || !isoDatePattern.test(value)) {
    return false;
  }

  const parsedDate = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsedDate.getTime()) && parsedDate.toISOString().slice(0, 10) === value;
}

function isValidDateRange(value: unknown): value is AiDateRange {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<AiDateRange>;

  return (
    isValidIsoDate(candidate.startDate) &&
    isValidIsoDate(candidate.endDate) &&
    typeof candidate.label === "string" &&
    candidate.label.trim().length > 0 &&
    candidate.startDate <= candidate.endDate
  );
}

function extractJsonObject(rawText: string): string {
  const trimmed = rawText.trim();

  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    return trimmed;
  }

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");

  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }

  return trimmed;
}

function safeParseIntent(rawText: string): AiIntentResult {
  try {
    //here json.parse takes the "dumb" text string that the AI wrote and converts it into a real , usable Javascript object in our computer's memory.
    const parsed = JSON.parse(extractJsonObject(rawText)) as Partial<AiIntentResult>;
    const confidence = typeof parsed.confidence === "number" ? parsed.confidence : 0;

    if (parsed.intent && connectedActionNames.has(parsed.intent)) {
      const result: AiIntentResult = {
        intent: parsed.intent as ConnectedActionName,
        confidence: confidence || 0.8
      };

      // ADDED: Universal clarification support. The LLM can ask one focused follow-up
      // when intent is understood but required details are ambiguous or missing.
      
      
      //now our text is a real javascript object 
      if (parsed.needsClarification === true) {
        result.needsClarification = true;
      }

      if (typeof parsed.clarificationQuestion === "string" && parsed.clarificationQuestion.trim().length > 0) {
        result.clarificationQuestion = parsed.clarificationQuestion.trim().slice(0, 300);
      }

      // ADDED: Trust AI-extracted hours only after numeric validation.
      if (typeof parsed.hours === "number" && Number.isFinite(parsed.hours) && parsed.hours > 0 && parsed.hours <= 24) {
        result.hours = parsed.hours;
      }

      // ADDED: Trust AI-extracted notes only after basic string validation.
      if (typeof parsed.notes === "string" && parsed.notes.trim().length > 0) {
        result.notes = parsed.notes.trim().slice(0, 500);
      }

      // ADDED: Trust AI-extracted project references only after basic TypeScript validation.
      if (typeof parsed.projectReference === "string" && parsed.projectReference.trim().length > 0) {
        result.projectReference = parsed.projectReference.trim();
      }
      // ADDED: Trust AI-extracted employee references only after basic TypeScript validation.
    if (typeof parsed.employeeReference === "string" && parsed.employeeReference.trim().length > 0) {
        result.employeeReference = parsed.employeeReference.trim();
    }
      if (typeof parsed.projectCode === "string" && parsed.projectCode.trim().length > 0) {
        result.projectCode = parsed.projectCode.trim().slice(0, 30).toUpperCase();
      }

      if (typeof parsed.projectName === "string" && parsed.projectName.trim().length > 0) {
        result.projectName = parsed.projectName.trim().slice(0, 120);
      }

      if (parsed.projectStatusFilter === "ACTIVE" || parsed.projectStatusFilter === "INACTIVE" || parsed.projectStatusFilter === "ALL") {
        result.projectStatusFilter = parsed.projectStatusFilter;
      }

      if (parsed.projectSortBy === "CREATED_AT" || parsed.projectSortBy === "PROJECT_CODE" || parsed.projectSortBy === "PROJECT_NAME") {
        result.projectSortBy = parsed.projectSortBy;
      }

      if (parsed.projectSortDirection === "ASC" || parsed.projectSortDirection === "DESC") {
        result.projectSortDirection = parsed.projectSortDirection;
      }

      if (typeof parsed.fullName === "string" && parsed.fullName.trim().length > 0) {
        result.fullName = parsed.fullName.trim().slice(0, 100);
      }

      if (typeof parsed.email === "string" && parsed.email.trim().length > 0) {
        result.email = parsed.email.trim().slice(0, 255).toLowerCase();
      }

      if (typeof parsed.password === "string" && parsed.password.trim().length > 0) {
        result.password = parsed.password.trim().slice(0, 72);
      }

      if (parsed.role === "EMPLOYEE" || parsed.role === "MANAGER" || parsed.role === "ADMIN") {
        result.role = parsed.role;
      }

      // ADDED: Trust AI-extracted dates only after TypeScript validates the shape and date format.
      if (isValidDateRange(parsed.dateRange)) {
        result.dateRange = {
          startDate: parsed.dateRange.startDate,
          endDate: parsed.dateRange.endDate,
          label: parsed.dateRange.label.trim()
        };
      }

      return result;
    }

    return {
      intent: "UNKNOWN",
      confidence
    };
  } catch {
    return {
      intent: "UNKNOWN",
      confidence: 0
    };
  }
}

export async function parseAiIntent(
  history: ConversationMessage[],
  currentUserMessage: string
): Promise<AiIntentResult> {
  if (!config.openRouterApiKey) {
    return {
      intent: "UNKNOWN",
      confidence: 0
    };
  }

  const recentHistory = history.slice(-MAX_INTENT_HISTORY_MESSAGES).map((message) => ({
    role: message.role,
    content: message.content
  }));

  const today = new Date().toISOString().slice(0, 10);


  //here our message goes to AI model
  const response = await client.chat.completions.create({
    model: config.openRouterModel,
    temperature: 0,
    messages: [
      {
        role: "system",
        content: [
          "You are an intent and parameter parser for a Timer Registration System Discord bot.",
          "Return ONLY valid JSON. No markdown. No explanation.",
          "Only return one of the connected action intent names below, or UNKNOWN.",
          "Do not invent action names.",
          "If the user clearly wants a connected action but required details are missing or ambiguous, return that intent with needsClarification=true and one short clarificationQuestion.",
          "When needsClarification=true and you have a likely interpretation, still include the structured fields that should be used if the user confirms.",
          "Do not use UNKNOWN for unclear parameters of a connected action. Use needsClarification instead.",
          "Today is " + today + ". Use this date to resolve relative phrases like today, yesterday, day before yesterday, this week, this month, last month, and date ranges.",
          "If the intent is VIEW_MY_TIME_ENTRIES, include dateRange whenever the user mentions or implies a date/range.",
          "If the intent is CREATE_TIME_ENTRY, extract hours, projectReference, notes, and a one-day dateRange. Do not save directly; code will ask for confirmation.",
          "If the intent is UPDATE_TIME_ENTRY, extract the target one-day dateRange, projectReference if mentioned, and changed fields like hours or notes. Do not save directly; code will ask for confirmation.",
          "If the intent is CANCEL_TIME_ENTRY, extract the target one-day dateRange and projectReference if mentioned. Do not cancel directly; code will ask for confirmation.",
          "If the intent is VIEW_TEAM_UTILIZATION, include dateRange whenever the user mentions or implies a date/range.",
          "If the user asks who missed work logs, forgot to submit timesheets, did not fill time, has missing entries, left work unsubmitted, or has incomplete time records, return VIEW_MISSING_ENTRIES.",
          "If the user asks to show/list all employees, users, TRS users, staff, or people in the system, return VIEW_ADMIN_USERS.",
          "If the user asks to show, list, give, fetch, get, or see all projects, company projects, TRS projects, project codes, available projects, current projects, active projects, inactive projects, latest projects, newest projects, oldest projects, or projects in the system, return VIEW_ADMIN_PROJECTS.",
          "For VIEW_ADMIN_PROJECTS, extract projectStatusFilter as ACTIVE when the user asks active/current/available projects, INACTIVE when they ask inactive/disabled projects, and ALL when they explicitly ask all projects.",
          "For VIEW_ADMIN_PROJECTS, extract projectSortBy and projectSortDirection: latest/newest/recent means CREATED_AT DESC; oldest/old first means CREATED_AT ASC; alphabetical/name wise means PROJECT_NAME ASC; project code/code order means PROJECT_CODE ASC.",
          "For VIEW_ADMIN_PROJECTS, if no status filter is specified, prefer ACTIVE. If no sort is specified, prefer PROJECT_CODE ASC.",
          "If the user asks to create/add/register a project, return CREATE_ADMIN_PROJECT and extract projectCode plus projectName.",
          "If projectCode or projectName is missing for CREATE_ADMIN_PROJECT, set needsClarification=true and ask for the missing value.",
          "If the user asks to create/add/register a user, employee, manager, or admin account, return CREATE_ADMIN_USER and extract fullName, email, password, and role.",
          "For CREATE_ADMIN_USER, if role is omitted but the user says employee, use EMPLOYEE; if manager, use MANAGER; if admin, use ADMIN.",
          "If fullName, email, password, or role is missing for CREATE_ADMIN_USER, set needsClarification=true and ask for the missing value.",
          "If the user asks to assign/add/give a user access to a project, return ASSIGN_ADMIN_USER_PROJECT and extract employeeReference plus projectReference.",
          "If either employeeReference or projectReference is missing for ASSIGN_ADMIN_USER_PROJECT, set needsClarification=true and ask for the missing value.",
          "If the user asks who is assigned to projects, assigned users with projects, users along with projects, user-project assignments, assignment mapping, project access, or all project assignments, return VIEW_ADMIN_ASSIGNMENTS.",
          "If the intent is VIEW_ADMIN_ASSIGNMENTS and the user mentions a project by code/name/partial name, include projectReference.",
          "If the intent is VIEW_ADMIN_ASSIGNMENTS and the user mentions a user/employee/person by name/email/partial name, include employeeReference.",
          "If the intent is VIEW_MISSING_ENTRIES, include dateRange whenever the user mentions or implies a date/range.",
          "If the user mentions a specific employee/person for reports, extract employeeReference as the clean employee name text.",
          "If the intent is VIEW_MISSING_ENTRIES and the user mentions an employee name, include employeeReference.",
          "Never ask the user whether they are manager/admin. Code will resolve the Discord user and enforce the role.",
          "Use conversation history to understand follow-up messages like what about client implementation or what about PRJ-001.",
          "If the intent is VIEW_MY_PROJECTS and the user mentions a specific project by name/code/partial name, include projectReference as the clean project text.",
          "If the user asks to summarize, explain, rewrite, or list previous conversation messages, return UNKNOWN so the conversational assistant can answer.",
          "dateRange.startDate and dateRange.endDate must be real calendar dates in YYYY-MM-DD format.",
          "If the user says night/morning/evening for time entries, keep the full date because TRS stores entries by date, not time of day.",
          "If the date/range is unclear but the user wants a connected action, set needsClarification=true and ask a specific date question.",
          "If the user says a month range without a year, infer the current year unless the wording is truly ambiguous.",
          "For phrases like January to April, return startDate as YYYY-01-01 and endDate as YYYY-04-30 using the current year.",
          "For awkward wording like from year january to april, treat it as January to April of the current year unless another year is mentioned.",
          "For follow-ups like of the year 2026, use conversation history to complete the previous connected action and return that action with the completed dateRange.",
          "Use UNKNOWN only for general chat, explanations, unsupported actions, or requests that are not connected to TRS actions.",
          "",
          "Connected actions:",
          formatConnectedActionsForPrompt(),
          "",
          "JSON format examples:",
          "{ \"intent\": \"VIEW_MY_PROFILE\", \"confidence\": 0.95 }",
          "{ \"intent\": \"VIEW_MY_PROJECTS\", \"confidence\": 0.95 }",
          "{ \"intent\": \"VIEW_MY_PROJECTS\", \"confidence\": 0.95, \"projectReference\": \"Client Implementation\" }",
          "{ \"intent\": \"VIEW_MY_TIME_ENTRIES\", \"confidence\": 0.95, \"dateRange\": { \"startDate\": \"2026-05-25\", \"endDate\": \"2026-05-25\", \"label\": \"the day before yesterday\" } }",
          "{ \"intent\": \"CREATE_TIME_ENTRY\", \"confidence\": 0.95, \"hours\": 4, \"projectReference\": \"Client Implementation\", \"dateRange\": { \"startDate\": \"2026-05-26\", \"endDate\": \"2026-05-26\", \"label\": \"yesterday\" }, \"notes\": \"API bug fixing\" }",
          "{ \"intent\": \"UPDATE_TIME_ENTRY\", \"confidence\": 0.95, \"hours\": 3, \"projectReference\": \"Client Implementation\", \"dateRange\": { \"startDate\": \"2026-05-26\", \"endDate\": \"2026-05-26\", \"label\": \"yesterday\" } }",
          "{ \"intent\": \"CANCEL_TIME_ENTRY\", \"confidence\": 0.95, \"projectReference\": \"Client Implementation\", \"dateRange\": { \"startDate\": \"2026-05-26\", \"endDate\": \"2026-05-26\", \"label\": \"yesterday\" } }",
          "{ \"intent\": \"VIEW_TEAM_UTILIZATION\", \"confidence\": 0.95, \"dateRange\": { \"startDate\": \"2026-05-25\", \"endDate\": \"2026-05-31\", \"label\": \"this week\" } }",
          "{ \"intent\": \"VIEW_MISSING_ENTRIES\", \"confidence\": 0.95, \"dateRange\": { \"startDate\": \"2026-05-01\", \"endDate\": \"2026-05-31\", \"label\": \"this month\" } }",
          "{ \"intent\": \"VIEW_MISSING_ENTRIES\", \"confidence\": 0.95, \"dateRange\": { \"startDate\": \"2026-05-01\", \"endDate\": \"2026-05-31\", \"label\": \"this month\" } }",
          "{ \"intent\": \"VIEW_MISSING_ENTRIES\", \"confidence\": 0.95, \"employeeReference\": \"Bijaya Tiwari\", \"dateRange\": { \"startDate\": \"2026-05-01\", \"endDate\": \"2026-05-31\", \"label\": \"May 2026\" } }",
          "{ \"intent\": \"VIEW_ADMIN_USERS\", \"confidence\": 0.95 }",
          "{ \"intent\": \"VIEW_ADMIN_PROJECTS\", \"confidence\": 0.95, \"projectStatusFilter\": \"ACTIVE\", \"projectSortBy\": \"PROJECT_CODE\", \"projectSortDirection\": \"ASC\" }",
          "{ \"intent\": \"VIEW_ADMIN_PROJECTS\", \"confidence\": 0.95, \"projectStatusFilter\": \"ALL\", \"projectSortBy\": \"PROJECT_CODE\", \"projectSortDirection\": \"ASC\", \"exampleUserText\": \"give me list of all the projects of our company\" }",
          "{ \"intent\": \"VIEW_ADMIN_PROJECTS\", \"confidence\": 0.95, \"projectStatusFilter\": \"ACTIVE\", \"projectSortBy\": \"CREATED_AT\", \"projectSortDirection\": \"DESC\", \"exampleUserText\": \"show latest active projects first\" }",
          "{ \"intent\": \"ASSIGN_ADMIN_USER_PROJECT\", \"confidence\": 0.95, \"employeeReference\": \"Bijaya Tiwari\", \"projectReference\": \"PRJ-002\" }",
          "{ \"intent\": \"VIEW_ADMIN_ASSIGNMENTS\", \"confidence\": 0.95 }",
          "{ \"intent\": \"VIEW_ADMIN_ASSIGNMENTS\", \"confidence\": 0.95, \"exampleUserText\": \"give me list of all the assigned users along with the project\" }",
          "{ \"intent\": \"VIEW_ADMIN_ASSIGNMENTS\", \"confidence\": 0.95, \"projectReference\": \"Client Implementation\" }",
          "{ \"intent\": \"VIEW_ADMIN_ASSIGNMENTS\", \"confidence\": 0.95, \"employeeReference\": \"Emp One\" }",
          "{ \"intent\": \"VIEW_MISSING_ENTRIES\", \"confidence\": 0.8, \"needsClarification\": true, \"clarificationQuestion\": \"Did you mean January 1, 2026 to April 30, 2026?\", \"dateRange\": { \"startDate\": \"2026-01-01\", \"endDate\": \"2026-04-30\", \"label\": \"January to April 2026\" } }",
          "{ \"intent\": \"CREATE_TIME_ENTRY\", \"confidence\": 0.85, \"needsClarification\": true, \"clarificationQuestion\": \"Which project and date should I log those hours to?\" }",
          "{ \"intent\": \"UNKNOWN\", \"confidence\": 0.2 }",
        ].join("\n")
      },
      ...recentHistory,  //our past message is replayed here 

// System: You are an intent parser...
// User: hey buddy who am I           <- old message #1
// Assistant: Hey Bijaya! You're...    <- old reply #1
// User: show my projects              <- old message #2
// Assistant: You have PRJ-001...      <- old reply #2
// User: what about last week          <- YOUR NEW MESSAGE

      {
        
        role: "user",
        content: currentUserMessage
      }
    ]
  });

  //means get the first generated response from the AI.
  const rawText = response.choices[0]?.message?.content ?? "";
  const parsedIntent = safeParseIntent(rawText);
  console.log("[TRS intent raw]", rawText);
  console.log("[TRS intent parsed]", parsedIntent);
  return parsedIntent;
}









