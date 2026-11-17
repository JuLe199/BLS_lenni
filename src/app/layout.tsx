import type { Metadata } from "next";
import { Inter, Roboto_Mono } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import { APP_NAME_LONG, APP_TAGLINE } from "@/lib/brand";
import { BLS_CASES } from "@/data/cases/bls";

const interSans = Inter({ variable: "--font-app-sans", subsets: ["latin"] });
const robotoMono = Roboto_Mono({ variable: "--font-app-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: APP_NAME_LONG,
  description: APP_TAGLINE,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${interSans.variable} ${robotoMono.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var d=localStorage.getItem("els_dark");if(d==="true"||(d===null&&matchMedia("(prefers-color-scheme:dark)").matches))document.documentElement.classList.add("dark")}catch(e){}`,
          }}
        />
      </head>
      <body className="min-h-full">
        <div className="flex min-h-screen">
          <Sidebar caseIds={BLS_CASES.map((c) => c.id)} />
          <div className="flex min-h-screen w-full min-w-0 flex-1 flex-col lg:pl-64">
            <main className="flex-1 pt-14 lg:pt-0">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
