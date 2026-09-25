import type { Metadata } from "next";
import "./register.css";

export const metadata: Metadata = {
  title: "Create account | AI 360°",
  robots: { index: false, follow: false },
};

export default function RegisterLayout({ children }: LayoutProps<"/register">) {
  return children;
}
