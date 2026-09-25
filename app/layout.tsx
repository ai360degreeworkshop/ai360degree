import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI 360° — Practical AI Learning",
  description:
    "Live, mentor-led AI capability building for students, professionals, entrepreneurs, and businesses.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
