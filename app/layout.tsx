import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: '财务经营游戏', description: '多人联机建筑公司经营模拟：竞标、投资、员工疲劳与财务排名' };
export default function RootLayout({ children }: {
    children: React.ReactNode;
}) { return <html lang="zh-CN"><body>{children}</body></html>; }
