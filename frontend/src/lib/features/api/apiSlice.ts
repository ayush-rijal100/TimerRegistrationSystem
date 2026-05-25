//sends the http request to the backend and handles the response, using RTK Query to manage caching and state updates
//sends request with the credentials

import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { getStoredToken } from "@/lib/auth";
import type {
  LoginRequest,
  LoginResponse,
  MissingEntriesReportResponse,
  AssignUserProjectRequest,
  AssignUserProjectResponse,
  CreateProjectRequest,
  CreateUserRequest,
  ProjectResponse,
  ProjectHoursReportResponse,
  TimeEntryRequest,
  TimeEntryResponse,
  UserResponse,
  UtilizationReportResponse,
  AuditLogResponse,
} from "@/lib/types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

export const apiSlice = createApi({
  reducerPath: "api",
  baseQuery: fetchBaseQuery({
    baseUrl: API_BASE_URL,
    prepareHeaders: (headers) => {
      if (typeof window === "undefined") {
        return headers;
      }

      const token = getStoredToken();

      if (token) {
        headers.set("authorization", `Bearer ${token}`);
      }

      return headers;
    },
  }),
  tagTypes: ["Auth", "Project", "TimeEntry", "Report", "Admin"],
  endpoints: (builder) => ({
    login: builder.mutation<LoginResponse, LoginRequest>({
      query: (credentials) => ({
        url: "/api/auth/login",
        method: "POST",
        body: credentials,
      }),
      invalidatesTags: ["Auth"],
    }),
    getMyProjects: builder.query<ProjectResponse[], void>({
      query: () => "/api/projects/my",
      providesTags: ["Project"],
    }),
    createTimeEntry: builder.mutation<TimeEntryResponse, TimeEntryRequest>({
      query: (entry) => ({
        url: "/api/time-entries",
        method: "POST",
        body: entry,
      }),
      invalidatesTags: ["TimeEntry"],
    }),
    getMyTimeEntries: builder.query<
      TimeEntryResponse[],
      { startDate: string; endDate: string }
    >({
      query: ({ startDate, endDate }) =>
        `/api/time-entries/my?startDate=${startDate}&endDate=${endDate}`,
      providesTags: ["TimeEntry"],
    }),
    updateTimeEntry: builder.mutation<
      TimeEntryResponse,
      { id: number; entry: TimeEntryRequest }
    >({
      query: ({ id, entry }) => ({
        url: `/api/time-entries/${id}`,
        method: "PUT",
        body: entry,
      }),
      invalidatesTags: ["TimeEntry"],
    }),
    getProjectHoursReport: builder.query<
      ProjectHoursReportResponse[],
      { startDate: string; endDate: string }
    >({
      query: ({ startDate, endDate }) =>
        `/api/reports/project-hours?startDate=${startDate}&endDate=${endDate}`,
      providesTags: ["Report"],
    }),
    getUtilizationReport: builder.query<
      UtilizationReportResponse[],
      { startDate: string; endDate: string }
    >({
      query: ({ startDate, endDate }) =>
        `/api/reports/utilization?startDate=${startDate}&endDate=${endDate}`,
      providesTags: ["Report"],
    }),
    getMissingEntriesReport: builder.query<
      MissingEntriesReportResponse[],
      { startDate: string; endDate: string }
    >({
      query: ({ startDate, endDate }) =>
        `/api/reports/missing-entries?startDate=${startDate}&endDate=${endDate}`,
      providesTags: ["Report"],
    }),
    getUsers: builder.query<UserResponse[], void>({
      query: () => "/api/admin/users",
      providesTags: ["Admin"],
    }),
    createUser: builder.mutation<UserResponse, CreateUserRequest>({
      query: (user) => ({
        url: "/api/admin/users",
        method: "POST",
        body: user,
      }),
      invalidatesTags: ["Admin"],
    }),
    getAdminProjects: builder.query<ProjectResponse[], void>({
      query: () => "/api/admin/projects",
      providesTags: ["Admin", "Project"],
    }),
    createProject: builder.mutation<ProjectResponse, CreateProjectRequest>({
      query: (project) => ({
        url: "/api/admin/projects",
        method: "POST",
        body: project,
      }),
      invalidatesTags: ["Admin", "Project"],
    }),
    assignUserProject: builder.mutation<
      AssignUserProjectResponse,
      AssignUserProjectRequest
    >({
      query: (assignment) => ({
        url: "/api/admin/user-projects",
        method: "POST",
        body: assignment,
      }),
      invalidatesTags: ["Admin", "Project"],
    }),
    updateUserStatus: builder.mutation<
      UserResponse,
      { id: number; isActive: boolean }
    >({
      query: ({ id, isActive }) => ({
        url: `/api/admin/users/${id}/status`,
        method: "PUT",
        body: { isActive },
      }),
      invalidatesTags: ["Admin"],
    }),
    getAuditLogs: builder.query<
      AuditLogResponse[],
      { startDate?: string; endDate?: string } | void
    >({
      query: (params) => {
        if (params && params.startDate && params.endDate) {
          return `/api/admin/audit-logs?startDate=${params.startDate}&endDate=${params.endDate}`;
        }
        return "/api/admin/audit-logs";
      },
      providesTags: ["Admin"],
    }),
  }),
});

export const {
  useLoginMutation,
  useGetMyProjectsQuery,
  useCreateTimeEntryMutation,
  useGetMyTimeEntriesQuery,
  useUpdateTimeEntryMutation,
  useGetProjectHoursReportQuery,
  useGetUtilizationReportQuery,
  useGetMissingEntriesReportQuery,
  useGetUsersQuery,
  useCreateUserMutation,
  useUpdateUserStatusMutation,
  useGetAdminProjectsQuery,
  useCreateProjectMutation,
  useAssignUserProjectMutation,
  useGetAuditLogsQuery,
} = apiSlice;
