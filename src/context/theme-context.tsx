import React, {createContext, useContext, useEffect, useState} from "react"

type Theme = "dark" | "light"

interface ThemeContextValue {
	theme: Theme
	toggleTheme: () => void
	setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({children}: {children: React.ReactNode}) {
	const [theme, setThemeState] = useState<Theme>(() => {
		try {
			const saved = localStorage.getItem("SideDevTools_theme")
			if (saved === "light" || saved === "dark") {
				return saved
			}
			return "dark"
		} catch {
			return "dark"
		}
	})

	useEffect(() => {
		const root = document.documentElement
		if (theme === "dark") {
			root.classList.add("dark")
			root.classList.remove("light")
			root.setAttribute("data-theme", "dark")
		} else {
			root.classList.add("light")
			root.classList.remove("dark")
			root.setAttribute("data-theme", "light")
		}
		try {
			localStorage.setItem("SideDevTools_theme", theme)
		} catch {}
	}, [theme])

	const toggleTheme = () => {
		setThemeState((prev) => (prev === "dark" ? "light" : "dark"))
	}

	const setTheme = (newTheme: Theme) => {
		setThemeState(newTheme)
	}

	return (
		<ThemeContext.Provider value={{theme, toggleTheme, setTheme}}>
			{children}
		</ThemeContext.Provider>
	)
}

export function useTheme() {
	const context = useContext(ThemeContext)
	if (!context) {
		throw new Error("useTheme must be used within a ThemeProvider")
	}
	return context
}
