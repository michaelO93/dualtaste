import "./globals.css";

export const metadata = {
  title: "DualTaste",
  description: "Home tastes, wherever you are — culturally grounded recommendations for Nigerians abroad, powered by Qloo's taste graph.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
