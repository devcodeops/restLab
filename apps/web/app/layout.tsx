import './globals.css';
import type { Metadata } from 'next';
import { AppHeader } from '../components/app-header';
import { AppProviders } from './providers';

export const metadata: Metadata = {
  title: 'RestLab Control Center',
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
        <AppProviders>
          <div className="mx-auto min-h-screen max-w-6xl p-4 md:p-8">
            <AppHeader />
            {children}
          </div>
        </AppProviders>
      </body>
    </html>
  );
}
