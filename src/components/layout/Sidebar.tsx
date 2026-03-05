"use client";

import { LayoutDashboard, Users, MessageSquareText, Settings } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { TemplatesSidebar } from "@/components/templates/TemplatesSidebar";
import { useState } from "react";

export function Sidebar() {
    const leads = useAppStore((state) => state.leads);
    const count = leads.length;

    const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);

    return (
        <>
            <aside className="fixed left-0 top-0 bottom-0 w-64 bg-background border-r flex flex-col pt-6 pb-4 z-40">
                {/* Brand */}
                <div className="flex items-center gap-3 px-6 mb-8">
                    <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-bold">
                        in
                    </div>
                    <span className="text-xl font-semibold tracking-tight">Leads</span>
                </div>

                {/* Nav */}
                <nav className="flex-1 px-4 space-y-2">
                    <div className="flex items-center gap-3 px-3 py-2.5 rounded-2xl bg-primary text-primary-foreground font-medium">
                        <LayoutDashboard className="w-5 h-5" />
                        <span>Dashboard</span>
                    </div>
                    <div className="flex items-center gap-3 px-3 py-2.5 rounded-2xl text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors cursor-pointer">
                        <Users className="w-5 h-5" />
                        <span>All Leads</span>
                        <span className="ml-auto w-6 h-6 rounded-full bg-accent/50 text-xs flex items-center justify-center text-foreground font-medium">
                            {count}
                        </span>
                    </div>
                    <div
                        onClick={() => setIsTemplatesOpen(true)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-2xl text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors cursor-pointer"
                    >
                        <MessageSquareText className="w-5 h-5" />
                        <span>Templates</span>
                    </div>
                    <div className="flex items-center gap-3 px-3 py-2.5 rounded-2xl text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors cursor-pointer">
                        <Settings className="w-5 h-5" />
                        <span>Settings</span>
                    </div>
                </nav>

                {/* Footer / Upgrade module replicating the reference UI */}
                <div className="px-4 mt-auto">
                    <div className="p-4 rounded-3xl bg-accent text-accent-foreground">
                        <h4 className="font-semibold mb-1">Upgrade to Pro</h4>
                        <p className="text-xs text-muted-foreground mb-4 opacity-80">
                            Export unlimited leads and access all templates.
                        </p>
                        <button className="w-full py-2.5 rounded-2xl bg-background text-foreground text-sm font-medium hover:bg-muted transition-colors">
                            Upgrade Now
                        </button>
                    </div>
                </div>
            </aside>

            <TemplatesSidebar
                isOpen={isTemplatesOpen}
                onOpenChange={setIsTemplatesOpen}
            />
        </>
    );
}
