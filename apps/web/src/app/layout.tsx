import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { ThemedToaster } from "@/components/layout/ThemedToaster";
import { THEME_INIT_SCRIPT } from "@/config/theme.config";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { VaultProvider } from "@/providers/VaultProvider";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Kryvex",
  description:
    "Your private vault for passwords, credentials, and sensitive information.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <ThemeProvider>
          <VaultProvider>{children}</VaultProvider>
          <ThemedToaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
