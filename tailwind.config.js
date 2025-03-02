/** @type {import('tailwindcss').Config} */
module.exports = {
	darkMode: ["class"],
	content: [
		'./pages/**/*.{ts,tsx}',
		'./components/**/*.{ts,tsx}',
		'./app/**/*.{ts,tsx}',
		'./src/**/*.{ts,tsx}',
	],
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			fontFamily: {
				heading: [
					'var(--font-heading)',
					'sans-serif'
				]
			},
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				chart: {
					'1': 'hsl(var(--chart-1))',
					'2': 'hsl(var(--chart-2))',
					'3': 'hsl(var(--chart-3))',
					'4': 'hsl(var(--chart-4))',
					'5': 'hsl(var(--chart-5))'
				}
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			keyframes: {
				'accordion-down': {
					from: {
						height: 0
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: 0
					}
				},
				'darken': {
					'0%': { opacity: 0 },
					'20%': { opacity: 0 },
					'100%': { opacity: 0.9 }
				},
				'lighten': {
					'0%': { opacity: 0 },
					'20%': { opacity: 0 },
					'100%': { opacity: 0.9 }
				},
				'sun-to-moon': {
					'0%': {
						transform: 'translate(-50vw, 50vh) scale(0.3)',
						filter: 'brightness(1.2) drop-shadow(0 0 20px rgba(255, 200, 0, 0.7))'
					},
					'40%': {
						transform: 'translate(-20vw, 10vh) scale(0.6) rotate(120deg)',
						filter: 'brightness(1) drop-shadow(0 0 10px rgba(255, 200, 0, 0.5))'
					},
					'70%': {
						transform: 'translate(0, 0) scale(0.9) rotate(240deg)',
						filter: 'brightness(0.8) drop-shadow(0 0 5px rgba(200, 220, 255, 0.2))'
					},
					'100%': {
						transform: 'translate(0, 0) scale(1) rotate(360deg)',
						filter: 'brightness(0.7) drop-shadow(0 0 15px rgba(200, 220, 255, 0.3))'
					}
				},
				'moon-to-sun': {
					'0%': {
						transform: 'translate(0, 0) scale(1) rotate(0deg)',
						filter: 'brightness(0.7) drop-shadow(0 0 15px rgba(200, 220, 255, 0.3))'
					},
					'40%': {
						transform: 'translate(-20vw, 10vh) scale(0.8) rotate(120deg)',
						filter: 'brightness(0.9) drop-shadow(0 0 5px rgba(255, 200, 0, 0.2))'
					},
					'70%': {
						transform: 'translate(-35vw, 30vh) scale(0.6) rotate(240deg)',
						filter: 'brightness(1) drop-shadow(0 0 10px rgba(255, 200, 0, 0.5))'
					},
					'100%': {
						transform: 'translate(-50vw, 50vh) scale(0.3) rotate(360deg)',
						filter: 'brightness(1.2) drop-shadow(0 0 20px rgba(255, 200, 0, 0.7))'
					}
				},
				'sun-rays-fade': {
					'0%': { opacity: 1, transform: 'scale(1) rotate(0deg)' },
					'50%': { opacity: 0.5, transform: 'scale(0.8) rotate(180deg)' },
					'100%': { opacity: 0, transform: 'scale(0) rotate(360deg)' }
				},
				'sun-rays-appear': {
					'0%': { opacity: 0, transform: 'scale(0) rotate(0deg)' },
					'50%': { opacity: 0.5, transform: 'scale(0.8) rotate(180deg)' },
					'100%': { opacity: 1, transform: 'scale(1) rotate(360deg)' }
				},
				'moon-appear': {
					'0%': { opacity: 0, transform: 'scale(0)' },
					'60%': { opacity: 0, transform: 'scale(0)' },
					'100%': { opacity: 1, transform: 'scale(1)' }
				},
				'moon-fade': {
					'0%': { opacity: 1, transform: 'scale(1)' },
					'40%': { opacity: 0, transform: 'scale(0)' },
					'100%': { opacity: 0, transform: 'scale(0)' }
				},
				'stars-appear': {
					'0%': { opacity: 0 },
					'60%': { opacity: 0 },
					'100%': { opacity: 1 }
				},
				'stars-disappear': {
					'0%': { opacity: 1 },
					'40%': { opacity: 0 },
					'100%': { opacity: 0 }
				},
				'twinkle': {
					'0%': { opacity: 0, transform: 'scale(0)' },
					'50%': { opacity: 0.8, transform: 'scale(1)' },
					'100%': { opacity: 0, transform: 'scale(0)' }
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'darken': 'darken 2s ease-in-out forwards',
				'lighten': 'lighten 2s ease-in-out forwards',
				'sun-to-moon': 'sun-to-moon 2s ease-in-out forwards',
				'moon-to-sun': 'moon-to-sun 2s ease-in-out forwards',
				'sun-rays-fade': 'sun-rays-fade 1.5s ease-in-out forwards',
				'sun-rays-appear': 'sun-rays-appear 1.5s ease-in-out forwards',
				'moon-appear': 'moon-appear 1s ease-in-out forwards',
				'moon-fade': 'moon-fade 1s ease-in-out forwards',
				'stars-appear': 'stars-appear 2s ease-in forwards',
				'stars-disappear': 'stars-disappear 2s ease-in forwards',
				'twinkle': 'twinkle 3s ease-in-out infinite'
			}
		}
	},
	plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
} 