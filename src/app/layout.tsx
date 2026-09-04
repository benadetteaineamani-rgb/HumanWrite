import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "HumanWrite",
  description: "A structural writing studio with editorial intelligence.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
