"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { useAppStore } from "@/store/useAppStore";

export function Providers({ children }: { children: React.ReactNode }) {
    const seedData = useAppStore((state) => state.seedData);
    const leads = useAppStore((state) => state.leads);

    // If there are no leads, let's seed the mock data on first load for demonstration
    React.useEffect(() => {
        if (leads.length === 0) {
            seedData();
        }
    }, [leads.length, seedData]);

    return (
        <NextThemesProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem={false}
            disableTransitionOnChange
        >
            {children}
        </NextThemesProvider>
    );
}
