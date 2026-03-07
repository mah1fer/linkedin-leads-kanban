"use client";

import { useAppStore } from "@/store/useAppStore";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { useState } from "react";

interface KanbanSettingsModalProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
}

export function KanbanSettingsModal({ isOpen, onOpenChange }: KanbanSettingsModalProps) {
    const columns = useAppStore((state) => state.columns);
    const addColumn = useAppStore((state) => state.addColumn);
    const updateColumn = useAppStore((state) => state.updateColumn);
    const deleteColumn = useAppStore((state) => state.deleteColumn);

    const [newColTitle, setNewColTitle] = useState("");

    const handleAdd = () => {
        if (!newColTitle.trim()) return;
        addColumn(newColTitle.trim());
        setNewColTitle("");
    };

    return (
        <Sheet open={isOpen} onOpenChange={onOpenChange}>
            <SheetContent className="w-[400px] sm:w-[500px] bg-background border-l flex flex-col h-full rounded-l-[2rem] outline-none">

                <SheetHeader className="text-left py-2 border-b border-border/50">
                    <div className="flex justify-between items-center">
                        <div>
                            <SheetTitle className="text-xl font-bold">Kanban Settings</SheetTitle>
                            <SheetDescription className="text-sm mt-1">
                                Customize your workflow flux and column order.
                            </SheetDescription>
                        </div>
                    </div>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto pt-6 pb-20 space-y-3 px-2">
                    {columns.map((col, index) => (
                        <div key={col.id} className="flex items-center gap-2 p-2 rounded-2xl bg-card border border-border shadow-sm">
                            <GripVertical className="w-5 h-5 text-muted-foreground cursor-grab opacity-50" />
                            <input
                                type="text"
                                value={col.title}
                                onChange={(e) => updateColumn(col.id, e.target.value)}
                                className="flex-1 bg-transparent border-none text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary rounded p-1"
                            />
                            <Button
                                variant="ghost"
                                size="icon"
                                className="w-8 h-8 rounded-full text-muted-foreground hover:text-destructive shrink-0"
                                onClick={() => deleteColumn(col.id)}
                                disabled={columns.length === 1}
                            >
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </div>
                    ))}

                    <div className="flex items-center gap-2 p-2 rounded-2xl border-2 border-dashed border-border/50 mt-4">
                        <input
                            type="text"
                            placeholder="New Column Title..."
                            value={newColTitle}
                            onChange={(e) => setNewColTitle(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") handleAdd();
                            }}
                            className="flex-1 bg-transparent border-none text-sm focus:outline-none focus:ring-2 focus:ring-primary rounded p-1"
                        />
                        <Button
                            variant="secondary"
                            size="icon"
                            className="w-8 h-8 rounded-full bg-accent hover:bg-primary hover:text-primary-foreground shrink-0"
                            onClick={handleAdd}
                        >
                            <Plus className="w-4 h-4" />
                        </Button>
                    </div>
                </div>

            </SheetContent>
        </Sheet>
    );
}
