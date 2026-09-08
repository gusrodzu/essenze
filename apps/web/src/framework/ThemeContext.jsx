import {createContext, useContext, useEffect, useMemo, useState} from 'react';

const ThemeContext = createContext(null);
const STORAGE_KEY = 'buzzbee-theme';
const VALID_THEMES = new Set(['light', 'dark']);

function getInitialTheme() {
  try {
    const storedTheme = window.localStorage.getItem(STORAGE_KEY);

    if (VALID_THEMES.has(storedTheme)) {
      return storedTheme;
    }

    return 'light';
  } catch {
    return 'light';
  }
}

export function ThemeProvider({children}) {
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;

    try {
      window.localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // La app continúa aunque el almacenamiento esté bloqueado.
    }
  }, [theme]);

  const value = useMemo(
    () => ({
      theme,
      setTheme: (nextTheme) => {
        if (VALID_THEMES.has(nextTheme)) {
          setTheme(nextTheme);
        }
      },
      toggleTheme: () =>
        setTheme((currentTheme) =>
          currentTheme === 'dark' ? 'light' : 'dark',
        ),
    }),
    [theme],
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useTheme debe usarse dentro de ThemeProvider');
  }

  return context;
}
