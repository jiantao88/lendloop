import type { Metadata } from "next";
import { Providers } from "@/components/Providers";
import { hasAppConfig } from "@/lib/config";
import "./globals.css";

export const metadata: Metadata = {
  title: "LendLoop",
  description: "Borrow what you need. Lend what you don’t.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {hasAppConfig() ? <Providers>{children}</Providers> : children}
      </body>
    </html>
  );
}
