"use client";

import { useAppStore } from "@/store/useAppStore";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Copy, Plus, Trash2 } from "lucide-react";
import { Lead } from "@/types";

interface TemplatesSidebarProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    // Optional lead context to preview placeholders
    leadContext?: Lead | null;
}

export function TemplatesSidebar({ isOpen, onOpenChange, leadContext }: TemplatesSidebarProps) {
    const templates = useAppStore((state) => state.templates);
    const deleteTemplate = useAppStore((state) => state.deleteTemplate);

    const getPreview = (content: string) => {
        if (!leadContext) return content;
        return content
            .replace(/{Nome}/g, leadContext.name.split(" ")[0])
            .replace(/{Cargo}/g, leadContext.role)
            .replace(/{Empresa}/g, leadContext.company);
    };

    const handleCopy = (content: string) => {
        navigator.clipboard.writeText(getPreview(content));
        // Could add toast here
    };

    return (
        <Sheet open={isOpen} onOpenChange={onOpenChange}>
            <SheetContent className="w-[400px] sm:w-[500px] bg-background border-l flex flex-col h-full rounded-l-[2rem] outline-none">

                <SheetHeader className="text-left py-2 border-b border-border/50">
                    <div className="flex justify-between items-center">
                        <div>
                            <SheetTitle className="text-xl font-bold">Message Templates</SheetTitle>
                            <SheetDescription className="text-sm mt-1">
                                Manage and copy messages. Placeholders: {'{Nome}, {Cargo}, {Empresa}'}
                            </SheetDescription>
                        </div>
                        <Button size="icon" variant="ghost" className="rounded-full shrink-0">
                            <Plus className="w-5 h-5 text-primary" />
                        </Button>
                    </div>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto pt-6 pb-20 space-y-4 px-2">
                    {templates.map((tpl) => {
                        const previewText = getPreview(tpl.content);
                        return (
                            <div key={tpl.id} className="p-4 rounded-3xl bg-card border border-border shadow-sm group">
                                <div className="flex items-center justify-between mb-2">
                                    <h4 className="font-semibold text-[15px]">{tpl.name}</h4>
                                    <div className="flex items-center gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full text-muted-foreground hover:text-destructive" onClick={() => deleteTemplate(tpl.id)}>
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                        <Button variant="secondary" size="icon" className="w-8 h-8 rounded-full bg-accent hover:bg-primary hover:text-primary-foreground" onClick={() => handleCopy(tpl.content)}>
                                            <Copy className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                                <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                                    {previewText}
                                </p>
                            </div>
                        );
                    })}
                </div>

            </SheetContent>
        </Sheet>
    );
}
