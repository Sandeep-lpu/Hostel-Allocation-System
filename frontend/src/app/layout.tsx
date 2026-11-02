import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'HostelSphere — Intelligent Residential Allocation System',
  description:
    'Real-time University Residential Allocation, Student Portals, and Warden Administration.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#f8fafc] text-slate-900 antialiased selection:bg-rose-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}

