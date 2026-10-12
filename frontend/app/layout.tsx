import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CarX — AI-Powered Used-Car Valuation, Search & Cross-City Deal Intelligence",
  description: "Find the right used car at the right price in any Indian city. Fair asking price ML estimation, itemized inter-city transport & RTO costs, and Gemma AI assistant.",
  keywords: "used cars India, car valuation, cross-city car comparison, fair price estimator, used car deals Delhi Mumbai Bangalore",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>{children}</body>
    </html>
  );
}
