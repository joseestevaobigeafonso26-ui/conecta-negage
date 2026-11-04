import type { Config } from 'tailwindcss'
export default {
  content: ['./app/**/*.{ts,tsx}'],
  theme: { extend: {
    colors: { brand: { blue: '#1E3A8A', lightBlue: '#3B82F6', green: '#059669', emerald: '#10B981', amber: '#F59E0B', dark: '#0F172A' } },
    fontFamily: { sans: ['var(--font-inter)', 'system-ui', 'sans-serif'] },
  } },
} satisfies Config
