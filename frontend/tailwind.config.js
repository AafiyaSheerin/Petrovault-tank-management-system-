/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // Brand colors
                primary: {
                    DEFAULT: '#7c3aed',
                    light: '#a78bfa',
                    dark: '#5b21b6',
                },
                navy: {
                    DEFAULT: '#1e293b',
                    light: '#334155',
                    dark: '#0f172a',
                },
                success: '#22c55e',
                warning: '#eab308',
                danger: '#ef4444',
                info: '#3b82f6',
                background: '#f1f5f9',
            },
            boxShadow: {
                card: '0 2px 8px rgba(15, 23, 42, 0.08)',
                cardHover: '0 6px 16px rgba(15, 23, 42, 0.12)',
            },
            borderRadius: {
                card: '12px',
            },
            keyframes: {
                wave: {
                    '0%, 100%': { transform: 'translateX(0) translateY(0)' },
                    '50%': { transform: 'translateX(-5%) translateY(-2px)' },
                },
                fillRise: {
                    '0%': { height: '0%' },
                    '100%': { height: 'var(--fill-height)' },
                },
                slideIn: {
                    '0%': { opacity: '0', transform: 'translateY(-10px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
            },
            animation: {
                wave: 'wave 3s ease-in-out infinite',
                fillRise: 'fillRise 1.2s ease-out forwards',
                slideIn: 'slideIn 0.3s ease-out',
                fadeIn: 'fadeIn 0.2s ease-out',
            },
        },
    },
    plugins: [],
}