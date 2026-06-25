import { Inter } from "next/font/google";
import "./globals.css";
import 'react-toastify/dist/ReactToastify.css';
import 'react-toastify/ReactToastify.min.css';

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "r2-image · 图床",
  description: "基于 Cloudflare Pages + R2 的图床",
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
