import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Selaras Ajar",
  description: "Sistem sekolah yang selaras — absensi, nilai, SPP, dan komunikasi dalam satu tempat.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-paper text-ink">{children}</body>
    </html>
  );
}
