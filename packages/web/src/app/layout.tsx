import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Loop Engineering",
  description: "Founder dashboard for loop-engineering autonomous operating model",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#0a0a0a] text-[#f0f0f0] min-h-screen">
        {children}
      </body>
    </html>
  );
}
