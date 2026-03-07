"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { useAppStore } from "@/store/useAppStore";

export function Providers({ children }: { children: React.ReactNode }) {
    const seedData = useAppStore((state) => state.seedData);
    const leads = useAppStore((state) => state.leads);
    const hasHydrated = useAppStore((state) => state._hasHydrated);
    const [hasSeeded, setHasSeeded] = React.useState(false);

    // Only seed mock data AFTER hydration completes and only once per session
    React.useEffect(() => {
        if (hasHydrated && !hasSeeded && leads.length === 0) {
            seedData();
            setHasSeeded(true);
        }
    }, [hasHydrated, hasSeeded, leads.length, seedData]);

    return (
        <NextThemesProvider
            attribute="class"
            defaultTheme="light"
            enableSystem={false}
            disableTransitionOnChange
        >
            {children}
        </NextThemesProvider>
    );
}
