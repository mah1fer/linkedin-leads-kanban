"use client";

import { Search, Bell, Download, Upload } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAppStore } from "@/store/useAppStore";
import { useRef } from "react";

export function Header() {
    const searchQuery = useAppStore((state) => state.searchQuery);
    const setSearchQuery = useAppStore((state) => state.setSearchQuery);
    const leads = useAppStore((state) => state.leads);
    const templates = useAppStore((state) => state.templates);
    const columns = useAppStore((state) => state.columns);
    const importData = useAppStore((state) => state.importData);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleExport = () => {
        const data = { leads, templates, columns };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `linkedin-leads-export-${new Date().toISOString().split("T")[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const json = JSON.parse(event.target?.result as string);
                if (json.leads && Array.isArray(json.leads)) {
                    importData(json);
                } else {
                    alert("Invalid backup file: Missing 'leads' array");
                }
            } catch (err) {
                alert("Failed to parse JSON file");
            }
        };
        reader.readAsText(file);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    return (
        <header className="h-20 border-b bg-background flex items-center justify-between px-8 bg-card/50 backdrop-blur-md sticky top-0 z-30">

            {/* Title */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Leads Overview</h1>
                <p className="text-sm text-muted-foreground">Manage and organize your LinkedIn outreach</p>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-4">
                {/* Search */}
                <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <input
                        type="text"
                        placeholder="Search leads..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-64 h-10 pl-10 pr-4 rounded-full bg-accent text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-background transition-all"
                    />
                </div>

                {/* Notifications */}
                <button className="relative w-10 h-10 rounded-full bg-accent flex items-center justify-center hover:bg-muted transition-colors text-foreground">
                    <Bell className="w-5 h-5" />
                    <span className="absolute top-2 right-2.5 w-2 h-2 rounded-full bg-primary ring-2 ring-accent"></span>
                </button>

                {/* Export / Import */}
                <div className="flex items-center gap-2 bg-accent rounded-full p-1 border">
                    <input
                        type="file"
                        accept="application/json"
                        className="hidden"
                        ref={fileInputRef}
                        onChange={handleImport}
                    />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="h-8 px-3 rounded-full text-xs font-medium bg-background shadow-sm hover:text-primary transition-colors flex items-center gap-1.5"
                    >
                        <Upload className="w-3.5 h-3.5" />
                        Import
                    </button>
                    <button
                        onClick={handleExport}
                        className="h-8 px-3 rounded-full text-xs font-medium hover:bg-background/50 hover:text-primary transition-colors flex items-center gap-1.5"
                    >
                        <Download className="w-3.5 h-3.5" />
                        Export
                    </button>
                </div>

                {/* User Profile */}
                <div className="flex items-center gap-3 ml-4 pl-4 border-l">
                    <Avatar className="w-10 h-10 border border-border">
                        <AvatarImage src="https://github.com/shadcn.png" />
                        <AvatarFallback>User</AvatarFallback>
                    </Avatar>
                </div>
            </div>
        </header>
    );
}
