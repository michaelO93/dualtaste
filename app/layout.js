import { Bricolage_Grotesque } from "next/font/google";
import "./globals.css";

const display = Bricolage_Grotesque({ subsets: ["latin"], weight: ["600", "800"], variable: "--font-display" });

export const metadata = {
  title: "DualTaste",
  description: "Home tastes, wherever you are — culturally grounded recommendations for Nigerians abroad, powered by Qloo's taste graph.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={display.variable}>
      <body>
        <div className="page-band" aria-hidden>
          <div className="band" />
        </div>
        {children}
      </body>
    </html>
  );
}
