"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { useAppStore } from "@/store/useAppStore";

function ExtensionBridge() {
    const addLead = useAppStore((state) => state.addLead);

    React.useEffect(() => {
        function handleMessage(event: MessageEvent) {
            if (event.source !== window) return;

            // Lead pushed directly from the LinkedIn panel extension
            if (event.data?.type === "KANBAN_EXT_PUSH" && event.data?.lead) {
                const lead = event.data.lead;
                addLead({
                    name: lead.name || "",
                    role: lead.role || "",
                    company: lead.company || "",
                    linkedInUrl: lead.linkedInUrl || lead.linkedinUrl || "",
                    email: lead.email || "",
                    phones: Array.isArray(lead.phones) ? lead.phones : [],
                    whatsapps: Array.isArray(lead.whatsapps) ? lead.whatsapps : [],
                    columnId: "novo",
                    priority: "Média",
                    notes: "",
                    tags: [],
                    nextAction: "",
                    nextActionDate: "",
                    links: Array.isArray(lead.links) ? lead.links : [],
                    history: [],
                });
            }
        }

        window.addEventListener("message", handleMessage);
        // Announce the app is ready for the extension
        window.postMessage({ type: "KANBAN_EXT_PING" }, "*");

        return () => window.removeEventListener("message", handleMessage);
    }, [addLead]);

    return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <NextThemesProvider
            attribute="class"
            defaultTheme="light"
            enableSystem={false}
            disableTransitionOnChange
        >
            <ExtensionBridge />
            {children}
        </NextThemesProvider>
    );
}
