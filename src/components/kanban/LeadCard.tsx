"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Lead } from "@/types";
import { Calendar, Briefcase, Building2, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LeadCardProps {
    lead: Lead;
    onClick: (lead: Lead) => void;
    onDelete?: (id: string) => void;
}

export function LeadCard({ lead, onClick, onDelete }: LeadCardProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: lead.id,
        data: { type: "Card", lead },
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    const priorityColor = {
        Alta: "border-l-destructive",
        Média: "border-l-orange-400",
        Baixa: "border-l-primary",
    }[lead.priority] ?? "border-l-border";

    const priorityBadge = {
        Alta: "bg-destructive/10 text-destructive",
        Média: "bg-orange-400/10 text-orange-500",
        Baixa: "bg-primary/10 text-primary",
    }[lead.priority] ?? "";

    if (isDragging) {
        return (
            <div
                ref={setNodeRef}
                style={style}
                className="opacity-40 h-[72px] bg-accent border-2 border-primary border-dashed rounded-xl mx-2"
            />
        );
    }

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            onClick={() => onClick(lead)}
            className={cn(
                "cursor-grab active:cursor-grabbing select-none",
                "bg-card border-l-[3px] border-y border-r border-border/40",
                "mx-2 px-3 py-2.5 rounded-xl flex flex-col gap-1.5",
                "hover:ring-1 ring-primary/30 hover:border-primary/30 shadow-sm transition-all group",
                priorityColor
            )}
        >
            {/* Row 1: Name + Priority Badge + Delete */}
            <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-[13px] leading-tight group-hover:text-primary transition-colors truncate flex-1">
                    {lead.name}
                </h3>
                <div className="flex items-center gap-1 shrink-0">
                    <span className={cn("text-[9px] px-1.5 py-0.5 font-bold uppercase tracking-widest rounded-sm", priorityBadge)}>
                        {lead.priority}
                    </span>
                    {onDelete && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onDelete(lead.id); }}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-destructive/10 hover:text-destructive text-muted-foreground"
                        >
                            <Trash2 className="w-3 h-3" />
                        </button>
                    )}
                </div>
            </div>

            {/* Row 2: Role + Company */}
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1 truncate">
                    <Briefcase className="w-3 h-3 shrink-0 opacity-60" />
                    <span className="truncate">{lead.role || "—"}</span>
                </span>
                {lead.company && (
                    <span className="flex items-center gap-1 truncate shrink-0">
                        <Building2 className="w-3 h-3 shrink-0 opacity-60" />
                        <span className="truncate max-w-[90px]">{lead.company}</span>
                    </span>
                )}
            </div>

            {/* Row 3: Next Action */}
            {lead.nextAction && (
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground/70 pt-0.5 border-t border-border/30">
                    <Calendar className="w-3 h-3 shrink-0" />
                    <span className="truncate">{lead.nextAction}</span>
                    {lead.nextActionDate && (
                        <span className="ml-auto shrink-0 font-medium tabular-nums">
                            {(() => {
                                try {
                                    const d = new Date(lead.nextActionDate);
                                    return !isNaN(d.getTime()) ? d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '';
                                } catch { return ''; }
                            })()}
                        </span>
                    )}
                </div>
            )}
        </div>
    );
}
