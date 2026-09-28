import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI 360° — Practical AI Learning",
  description:
    "Live, mentor-led AI workshops where you turn AI into tools you can actually use — for students, professionals, and businesses.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
