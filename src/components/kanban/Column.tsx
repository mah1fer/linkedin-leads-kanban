"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Column as ColumnType, Lead } from "@/types";
import { useMemo } from "react";
import { LeadCard } from "./LeadCard";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";

interface ColumnProps {
    column: ColumnType;
    leads: Lead[];
    onLeadClick: (lead: Lead) => void;
}

export function Column({ column, leads, onLeadClick }: ColumnProps) {
    const { setNodeRef, isOver } = useSortable({
        id: column.id,
        data: {
            type: "Column",
            column,
        },
    });

    const leadIds = useMemo(() => leads.map((l) => l.id), [leads]);

    return (
        <div className="flex flex-col flex-shrink-0 w-[320px] h-full bg-secondary/50 rounded-3xl overflow-hidden border border-border/50">

            {/* Column Header */}
            <div className="p-4 flex items-center justify-between border-b border-border/50 bg-secondary/80">
                <div className="flex items-center gap-2">
                    <h2 className="font-semibold text-[15px]">{column.title}</h2>
                    <span className="bg-background text-muted-foreground text-xs font-medium px-2 py-0.5 rounded-full border border-border">
                        {leads.length}
                    </span>
                </div>
            </div>

            {/* Column Body / Droppable Area */}
            <div
                ref={setNodeRef}
                className={`flex-1 flex flex-col gap-1 overflow-y-auto overflow-x-hidden p-2 pb-4 transition-colors ${isOver ? "bg-accent/20 ring-inset ring-2 ring-primary/30" : ""
                    }`}
            >
                <SortableContext items={leadIds} strategy={verticalListSortingStrategy}>
                    {leads.map((lead) => (
                        <LeadCard key={lead.id} lead={lead} onClick={onLeadClick} />
                    ))}
                </SortableContext>

                {leads.length === 0 && (
                    <div className="h-24 m-2 rounded-2xl border-2 border-dashed border-border flex items-center justify-center text-xs text-muted-foreground font-medium opacity-50">
                        Drop cards here
                    </div>
                )}
            </div>
        </div>
    );
}
