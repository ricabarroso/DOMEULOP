import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { DocumentSessionProvider } from "@/components/document-session-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Gerador de Documentos Médicos",
  description: "Gerador de documentos médicos com acesso autenticado e modelos de prescrição por conta.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <DocumentSessionProvider>{children}</DocumentSessionProvider>
      </body>
    </html>
  );
}
