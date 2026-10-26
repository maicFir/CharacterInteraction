import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: '雨停之前 · After Rain',
  description: '雨夜咖啡馆，与旅行摄影师 Mira 坐一会儿。一个可以聆听、交流与打断的互动场景。',
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
