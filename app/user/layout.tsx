import type { Metadata } from "next";
import "./dashboard.css";

export const metadata: Metadata = {
  title: "My Learning | AI 360°",
  robots: { index: false, follow: false },
};

export default function DashboardLayout({
  children,
}: LayoutProps<"/user">) {
  return children;
}
