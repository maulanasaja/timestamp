import "./globals.css";

export const metadata = {
  title: "Photo Timestamp Generator",
  description: "Aplikasi premium untuk membuat timestamp pada foto.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body>
        {children}
      </body>
    </html>
  );
}
