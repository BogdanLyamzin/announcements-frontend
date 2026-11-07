import type { Metadata } from "next";
import { AuthProvider } from "@/components/auth-provider";
import { AppShell } from "@/components/app-shell";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Сусіди — дошка оголошень", template: "%s · Сусіди" },
  description: "Знайдіть потрібне, запропонуйте своє. Речі, послуги й можливості поруч.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="uk"><body><AuthProvider><AppShell>{children}</AppShell></AuthProvider></body></html>;
}
