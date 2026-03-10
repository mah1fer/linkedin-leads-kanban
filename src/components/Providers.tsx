"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { useAppStore } from "@/store/useAppStore";

function buildLeadFromExtension(lead: Record<string, unknown>) {
    return {
        name: (lead.name as string) || "",
        role: (lead.role as string) || "",
        company: (lead.company as string) || "",
        linkedInUrl: (lead.linkedInUrl as string) || (lead.linkedinUrl as string) || (lead.linkedin_url as string) || "",
        email: (lead.email as string) || "",
        phones: Array.isArray(lead.phones) ? lead.phones as string[] : [],
        whatsapps: Array.isArray(lead.whatsapps) ? lead.whatsapps as string[] : [],
        columnId: "novo",
        priority: "Média" as const,
        notes: "",
        tags: [],
        nextAction: "",
        nextActionDate: "",
        links: Array.isArray(lead.links) ? lead.links as { id: string; label: string; url: string }[] : [],
        history: [],
    };
}

function ExtensionBridge() {
    const addLead = useAppStore((state) => state.addLead);

    React.useEffect(() => {
        function handleMessage(event: MessageEvent) {
            if (event.source !== window) return;

            // Single lead pushed from LinkedIn profile panel
            if (event.data?.type === "KANBAN_EXT_PUSH" && event.data?.lead) {
                addLead(buildLeadFromExtension(event.data.lead as Record<string, unknown>));
            }

            // Bulk leads pushed from LinkedIn company page panel
            if (event.data?.type === "KANBAN_EXT_BULK_PUSH" && Array.isArray(event.data?.leads)) {
                const leads = event.data.leads as Record<string, unknown>[];
                const enrich: boolean = event.data.enrich === true;

                leads.forEach(lead => addLead(buildLeadFromExtension(lead)));

                // Se solicitado enriquecimento, dispara em background após salvar
                if (enrich && leads.length > 0) {
                    // Pequeno delay para o store persistir antes de enriquecer
                    setTimeout(() => {
                        window.postMessage({ type: "KANBAN_EXT_BULK_ENRICH_REQUEST", count: leads.length }, "*");
                    }, 800);
                }
            }
        }

        window.addEventListener("message", handleMessage);
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
