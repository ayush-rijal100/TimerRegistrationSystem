import type { Metadata } from "next";
import { ReduxProvider } from "@/components/providers/ReduxProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Time Registration System",
  description: "Role-based time tracking and reporting platform.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <ReduxProvider>{children}</ReduxProvider>
      </body>
    </html>
  );
}
