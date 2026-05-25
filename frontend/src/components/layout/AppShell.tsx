"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  BriefcaseBusiness,
  Clock3,
  LogOut,
  ShieldCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { clearAuthSession } from "@/lib/auth";
import type { AuthUser } from "@/lib/types";

type AppShellProps = {
  children: React.ReactNode;
  pageTitle: string;
  pageDescription: string;
  user: AuthUser;
};

const navItems = [
  {
    href: "/employee/timesheet",
    icon: Clock3,
    label: "Timesheet",
    roles: ["EMPLOYEE"],
  },
  {
    href: "/manager/reports",
    icon: BarChart3,
    label: "Reports",
    roles: ["MANAGER", "ADMIN"],
  },
  {
    href: "/admin",
    icon: ShieldCheck,
    label: "Admin",
    roles: ["ADMIN"],
  },
];

function getBrandHref(role: AuthUser["role"]) {
  if (role === "MANAGER") {
    return "/manager/reports";
  }

  if (role === "ADMIN") {
    return "/admin";
  }

  return "/employee/timesheet";
}

export function AppShell({
  children,
  pageDescription,
  pageTitle,
  user,
}: AppShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const visibleNavItems = navItems.filter((item) =>
    item.roles.includes(user.role)
  );

  function handleLogout() {
    clearAuthSession();
    router.replace("/login");
  }

  return (
    <div className="min-h-screen bg-background text-foreground lg:grid lg:grid-cols-[248px_1fr]">
      <aside className="border-b border-sidebar-border bg-sidebar text-sidebar-foreground lg:sticky lg:top-0 lg:min-h-screen lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between gap-3 px-5 py-5 lg:block">
          <Link className="flex items-center gap-3" href={getBrandHref(user.role)}>
            <span className="flex size-9 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
              <BriefcaseBusiness className="size-5" />
            </span>
            <span>
              <span className="block text-sm font-semibold leading-tight">
                Time Registration
              </span>
              <span className="block text-xs text-sidebar-foreground/70">
                Sireto operations
              </span>
            </span>
          </Link>

          <Button
            className="lg:hidden"
            onClick={handleLogout}
            size="icon"
            variant="secondary"
          >
            <LogOut className="size-4" />
          </Button>
        </div>

        <Separator className="bg-sidebar-border" />

        <nav className="flex gap-2 overflow-x-auto px-5 py-4 lg:block lg:space-y-1.5">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-[#193832] text-[#31a79c]"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                }`}
                href={item.href}
                key={item.href}
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <main className="min-w-0">
        <header className="flex flex-col gap-4 border-b border-border bg-card/95 px-5 py-5 shadow-sm md:flex-row md:items-center md:justify-between lg:px-8">
          <div>
            <h1 className="text-2xl font-semibold leading-tight">{pageTitle}</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              {pageDescription}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <div className="min-w-0 text-right">
              <p className="text-sm font-semibold">{user.fullName}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
            <Badge className="shrink-0" variant="secondary">
              {user.role}
            </Badge>
            <Button
              className="hidden shrink-0 whitespace-nowrap lg:inline-flex"
              onClick={handleLogout}
              size="sm"
            >
              <LogOut className="size-4" />
              Logout
            </Button>
          </div>
        </header>

        <div className="mx-auto w-full max-w-[1280px] px-5 py-7 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}
