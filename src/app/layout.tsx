import type { Metadata } from "next";
import { Lora, Plus_Jakarta_Sans } from "next/font/google";
import { cn } from "@/lib/utils";
import "./globals.css";

// Font asli desain (assets/styles.css prototipe: Lora utk heading, Plus Jakarta Sans utk body) —
// sebelumnya globals.css cuma fallback ke font sistem (gak pernah benar-benar dimuat), jadi
// SELURUH judul & teks app sungguhan render pakai typeface beda dari yang dirancang.
const lora = Lora({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-serif-loaded",
  display: "swap",
});
const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-sans-loaded",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Selaras Ajar",
  description: "Sistem sekolah yang selaras — absensi, nilai, SPP, dan komunikasi dalam satu tempat.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className={cn("h-full antialiased", lora.variable, plusJakartaSans.variable)}>
      <body className="min-h-full flex flex-col bg-paper text-ink">{children}</body>
    </html>
  );
}
