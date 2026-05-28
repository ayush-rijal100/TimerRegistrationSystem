import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function EmployeeTimesheetPage() {
  redirect("/employee/timesheet/daily");
}
