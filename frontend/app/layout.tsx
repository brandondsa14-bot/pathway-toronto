import './globals.css';
import type { Metadata } from 'next';
export const metadata: Metadata = {title:'PATHway Toronto | Explore downtown below', description:'An open, research-grounded prototype for Toronto PATH navigation.'};
export default function RootLayout({children}:{children:React.ReactNode}) {return <html lang="en"><body>{children}</body></html>;}