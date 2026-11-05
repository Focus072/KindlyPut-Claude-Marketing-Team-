import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kindly Put Studio · Team",
  description: "Private workspace for the Kindly Put Studio content team.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
