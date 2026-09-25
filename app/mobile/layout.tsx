import type { Metadata } from "next";
import "./mobile.css";

export const metadata: Metadata = {
  title: "AI 360° — Mobile",
  robots: { index: false, follow: false },
};

export default function MobileLayout({ children }: LayoutProps<"/mobile">) {
  return children;
}
