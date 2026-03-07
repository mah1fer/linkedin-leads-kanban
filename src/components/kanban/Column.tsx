"use client";

import { useSortable } from "@dnd-kit/sortable";
import { Column as ColumnType, Lead } from "@/types";
import { useMemo } from "react";
import { LeadCard } from "./LeadCard";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";

interface ColumnProps {
    column: ColumnType;
    leads: Lead[];
    onLeadClick: (lead: Lead) => void;
    onLeadDelete?: (id: string) => void;
}

export function Column({ column, leads, onLeadClick, onLeadDelete }: ColumnProps) {
    const { setNodeRef, isOver } = useSortable({
        id: column.id,
        data: { type: "Column", column },
    });

    const leadIds = useMemo(() => leads.map((l) => l.id), [leads]);

    return (
        <div className="flex flex-col flex-shrink-0 w-[280px] h-full bg-secondary/50 rounded-3xl overflow-hidden border border-border/50">

            {/* Column Header */}
            <div className="px-4 py-3 flex items-center justify-between border-b border-border/40 bg-secondary/80">
                <div className="flex items-center gap-2">
                    <h2 className="font-semibold text-[14px]">{column.title}</h2>
                    <span className="bg-background text-muted-foreground text-[11px] font-semibold px-2 py-0.5 rounded-full border border-border tabular-nums">
                        {leads.length}
                    </span>
                </div>
            </div>

            {/* Drop Area */}
            <div
                ref={setNodeRef}
                className={`flex-1 flex flex-col gap-1.5 overflow-y-auto overflow-x-hidden py-2 pb-4 transition-colors ${
                    isOver ? "bg-primary/5 ring-inset ring-2 ring-primary/20" : ""
                }`}
            >
                <SortableContext items={leadIds} strategy={verticalListSortingStrategy}>
                    {leads.map((lead) => (
                        <LeadCard
                            key={lead.id}
                            lead={lead}
                            onClick={onLeadClick}
                            onDelete={onLeadDelete}
                        />
                    ))}
                </SortableContext>

                {leads.length === 0 && (
                    <div className="h-20 mx-2 rounded-xl border-2 border-dashed border-border/40 flex items-center justify-center text-[11px] text-muted-foreground/50 font-medium">
                        Solte aqui
                    </div>
                )}
            </div>
        </div>
    );
}
