import './globals.css';
import Link from 'next/link';
import type { Metadata } from 'next';
import { ThemeToggle } from '../components/theme-toggle';

export const metadata: Metadata = {
  title: 'REST Lab Control Center',
  description: 'Microservices traffic lab',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                try {
                  var stored = localStorage.getItem('restlab-theme');
                  var theme = stored === 'dark' || stored === 'light' ? stored : null;
                  if (!theme && typeof window !== 'undefined' && window.matchMedia) {
                    theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                  }
                  if (!theme) theme = 'light';
                  document.documentElement.setAttribute('data-theme', theme);
                  document.documentElement.style.colorScheme = theme;
                } catch (e) {
                  document.documentElement.setAttribute('data-theme', 'light');
                  document.documentElement.style.colorScheme = 'light';
                }
              })();
            `,
          }}
        />
      </head>
      <body>
        <div className="mx-auto min-h-screen max-w-6xl p-4 md:p-8">
          <header className="mb-6 flex items-center justify-between">
            <h1 className="text-2xl font-semibold">REST Lab | Centro de Control</h1>
            <div className="flex items-center gap-3">
              <nav className="flex gap-3 text-sm">
                <Link href="/" className="underline-offset-2 hover:underline">
                  Dashboard
                </Link>
                <Link href="/services" className="underline-offset-2 hover:underline">
                  Servicios
                </Link>
                <Link href="/sigkill" className="underline-offset-2 hover:underline">
                  SigKill
                </Link>
              </nav>
              <ThemeToggle />
            </div>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
