import "./globals.css";
import { Nunito } from 'next/font/google'

const nunito = Nunito ({
  subsets: ['latin'],
  display: 'swap',
})

export const metadata = {
  title: "researcher",
  description: "wow this is so cool you should use it",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${nunito.className}`}>
        {children}
      </body>
    </html>
  );
}
