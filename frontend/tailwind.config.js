/** @type {import('tailwindcss').Config} */
export default {
    darkMode: 'class',
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                companyBlue: '#0056b3',
                companyRed: '#d32f2f',
                // Dark mode accent — muted corporate blue (replaces neon cyan)
                darkAccent: '#4a7dc4',
                zone: {
                    warehouse: {
                        light: '#ebf5ff',
                        DEFAULT: '#0056b3',
                        dark: '#003d80',
                    },
                    office: {
                        light: '#fdfbf7',
                        DEFAULT: '#8d6e63',
                        dark: '#5d4037',
                    },
                    counter: {
                        light: '#e6f2ff',
                        DEFAULT: '#1f8bff',
                        dark: '#1460b2',
                    },
                    logistics: {
                        light: '#fff5eb',
                        DEFAULT: '#fd7e14',
                        dark: '#ca6510',
                    },
                    tire: {
                        light: '#fae8ff',
                        DEFAULT: '#d946ef',
                        dark: '#a21caf',
                    },
                    call: {
                        light: '#eef2ff',
                        DEFAULT: '#4f46e5',
                        dark: '#3730a3',
                    },
                    sales: {
                        light: '#fce7f3',
                        DEFAULT: '#db2777',
                        dark: '#9d174d',
                    }
                },
                status: {
                    overtime: '#f59e0b',
                    medical: '#8b5cf6',
                    off: '#0ea5e9',
                }
            },
            boxShadow: {
                // Soft corporate shadows — replaces old neon glows
                'soft-blue': '0 4px 20px rgba(74, 125, 196, 0.15)',
                'soft-sm': '0 2px 8px rgba(15, 23, 42, 0.25)',
            }
        },
    },
    plugins: [],
}
