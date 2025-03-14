import { create } from "zustand"
import { persist } from "zustand/middleware"

type Theme = "dark" | "light" | "system"

interface ThemeStore {
  theme: Theme
  setTheme: (theme: Theme) => void
}

export const useTheme = create<ThemeStore>()(
  persist(
    (set) => ({
      theme: "system",
      setTheme: (theme) => {
        const root = window.document.documentElement
        root.classList.remove("light", "dark")

        if (theme === "system") {
          const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
            ? "dark"
            : "light"
          root.classList.add(systemTheme)
        } else {
          root.classList.add(theme)
        }

        set({ theme })
      },
    }),
    {
      name: "theme-storage",
    }
  )
)

// Initialize theme
if (typeof window !== "undefined") {
  const theme = useTheme.getState().theme
  useTheme.getState().setTheme(theme)

  // Listen for system theme changes
  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
  mediaQuery.addListener((e) => {
    if (useTheme.getState().theme === "system") {
      useTheme.getState().setTheme("system")
    }
  })
}
