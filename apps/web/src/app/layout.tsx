import type { Metadata } from "next";
import { Inter, Oswald } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { PeladaProvider } from "@/contexts/PeladaContext";
import { ptBR } from "@/i18n/pt-BR";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const oswald = Oswald({ subsets: ["latin"], weight: ["500", "600"], variable: "--font-oswald" });

export const metadata: Metadata = {
  title: ptBR.app.brand,
  description: ptBR.app.subtitle,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.variable} ${oswald.variable} font-sans`}>
        <AuthProvider>
          <PeladaProvider>{children}</PeladaProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
