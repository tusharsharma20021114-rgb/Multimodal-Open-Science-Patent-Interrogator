import type { Metadata } from "next";
import "./globals.css";
import NavBar from "@/components/NavBar";

export const metadata: Metadata = {
  title: "Multimodal RAG Engine — Open-Science & Patent Interrogator",
  description:
    "Upload scientific papers and patents, extract diagrams with AI vision, and query your documents with a multimodal RAG pipeline powered by Gemini.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <div className="bg-mesh" />
        <NavBar />
        <main>{children}</main>
      </body>
    </html>
  );
}
