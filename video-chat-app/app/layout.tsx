import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CartickMeet",
  description: "A multi-peer WebRTC video chat app built with Next.js and Socket.IO.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
