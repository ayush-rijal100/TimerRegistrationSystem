import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";
import type { SerializedError } from "@reduxjs/toolkit";
import type { ApiErrorResponse } from "@/lib/types";

export function getApiErrorMessage(
  error: FetchBaseQueryError | SerializedError | undefined
) {
  if (!error) {
    return "Something went wrong. Please try again.";
  }

  if ("status" in error && error.status === "FETCH_ERROR") {
    return "Could not reach the backend. Check that the Spring Boot API is running on port 8080.";
  }

  if ("status" in error && error.status === "PARSING_ERROR") {
    return "The backend response could not be read. Please try again.";
  }

  if ("status" in error && error.status === 401) {
    return "Your session is no longer valid. Please log in again.";
  }

  if ("status" in error && error.status === 403) {
    return "You do not have permission to perform this action.";
  }

  if ("data" in error && error.data) {
    const data = error.data as Partial<ApiErrorResponse>;
    return data.message ?? data.error ?? "Request failed. Please try again.";
  }

  if ("message" in error && error.message) {
    return error.message;
  }

  return "Request failed. Please try again.";
}
