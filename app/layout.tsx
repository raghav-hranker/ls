import "./globals.css"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import type React from "react" 

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Livestream",
  description:
    "Welcome to the class",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>

    </html>
  )
}

