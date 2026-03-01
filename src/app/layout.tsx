import type { Metadata } from "next";
import { Toaster } from "@/components/ui/shadcn";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cenovka",
  description: "MVP tvorca cenovych ponuk s PDF exportom",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="sk">
      <body className="antialiased">
        {children}
        <Toaster richColors closeButton />
      </body>
    </html>
  );
}
