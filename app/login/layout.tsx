import type { Metadata } from "next";
import "./login.css";

export const metadata: Metadata = {
  title: "Log in | AI 360°",
  robots: { index: false, follow: false },
};

export default function LoginLayout({ children }: LayoutProps<"/login">) {
  return children;
}
