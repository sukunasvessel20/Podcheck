import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PodCheck",
  description: "Local iPod-focused audio compatibility checker",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
