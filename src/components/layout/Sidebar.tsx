"use client";

import { LayoutDashboard, Building2, SlidersHorizontal, Search } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { KanbanSettingsModal } from "@/components/kanban/KanbanSettingsModal";
import { SearchModal } from "@/components/leads/SearchModal";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function Sidebar() {
    const leads = useAppStore((state) => state.leads);
    const count = leads.length;

    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const pathname = usePathname();

    return (
        <>
            <aside className="fixed left-0 top-0 bottom-0 w-64 bg-sidebar text-sidebar-foreground flex flex-col pt-6 pb-4 z-40">
                {/* Brand */}
                <div className="flex items-center gap-3 px-6 mb-8">
                    <div className="w-8 h-8 rounded-xl bg-sidebar-primary flex items-center justify-center text-sidebar-primary-foreground font-bold">
                        in
                    </div>
                    <span className="text-xl font-semibold tracking-tight">Leads</span>
                </div>

                {/* Nav */}
                <nav className="flex-1 px-4 space-y-2">
                    <Link
                        href="/"
                        className={cn(
                            "flex items-center gap-3 px-3 py-2.5 rounded-2xl font-medium transition-colors",
                            pathname === "/"
                                ? "bg-sidebar-primary text-sidebar-primary-foreground"
                                : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                        )}
                    >
                        <LayoutDashboard className="w-5 h-5 opacity-80" />
                        <span>Dashboard</span>
                        {count > 0 && (
                            <span className="ml-auto text-xs bg-white/20 rounded-full px-2 py-0.5">{count}</span>
                        )}
                    </Link>

                    <Link
                        href="/company"
                        className={cn(
                            "flex items-center gap-3 px-3 py-2.5 rounded-2xl font-medium transition-colors",
                            pathname === "/company"
                                ? "bg-sidebar-primary text-sidebar-primary-foreground"
                                : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                        )}
                    >
                        <Building2 className="w-5 h-5 opacity-80" />
                        <span>Busca por Empresa</span>
                    </Link>

                    <div
                        onClick={() => setIsSearchOpen(true)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors cursor-pointer group"
                    >
                        <Search className="w-5 h-5 opacity-70 group-hover:opacity-100 transition-opacity" />
                        <span>Smart Search</span>
                    </div>

                    <div
                        onClick={() => setIsSettingsOpen(true)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors cursor-pointer group"
                    >
                        <SlidersHorizontal className="w-5 h-5 opacity-70 group-hover:opacity-100 transition-opacity" />
                        <span>Kanban Settings</span>
                    </div>
                </nav>
            </aside>

            <KanbanSettingsModal
                isOpen={isSettingsOpen}
                onOpenChange={setIsSettingsOpen}
            />
            <SearchModal
                isOpen={isSearchOpen}
                onOpenChange={setIsSearchOpen}
            />
        </>
    );
}
