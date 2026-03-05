"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Lead } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Calendar, Building, Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";

interface LeadCardProps {
    lead: Lead;
    onClick: (lead: Lead) => void;
}

export function LeadCard({ lead, onClick }: LeadCardProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: lead.id,
        data: {
            type: "Card",
            lead,
        },
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    const priorityColor = {
        Alta: "bg-destructive/10 text-destructive border-destructive/20",
        Média: "bg-orange-500/10 text-orange-500 border-orange-500/20",
        Baixa: "bg-primary/10 text-primary border-primary/20",
    }[lead.priority];

    if (isDragging) {
        return (
            <div
                ref={setNodeRef}
                style={style}
                className="opacity-50 min-h-[140px] bg-accent border-2 border-primary border-dashed rounded-2xl flex items-center justify-center m-2"
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
                "cursor-grab active:cursor-grabbing hover:ring-2 ring-primary/50 transition-all",
                "bg-card text-card-foreground border border-border shadow-sm m-2 p-4 rounded-2xl flex flex-col gap-3 group"
            )}
        >
            <div className="flex justify-between items-start gap-2">
                <h3 className="font-semibold text-[15px] leading-tight group-hover:text-primary transition-colors">
                    {lead.name}
                </h3>
                <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 h-5 font-medium border rounded-full", priorityColor)}>
                    {lead.priority}
                </Badge>
            </div>

            <div className="space-y-1.5 flex-1 mt-1 text-xs text-muted-foreground font-medium">
                <div className="flex items-center gap-2">
                    <Building className="w-3.5 h-3.5 opacity-70" />
                    <span className="truncate">{lead.company}</span>
                </div>
                <div className="flex items-center gap-2">
                    <Briefcase className="w-3.5 h-3.5 opacity-70" />
                    <span className="truncate">{lead.role}</span>
                </div>
            </div>

            <div className="flex flex-wrap gap-1.5 mt-2">
                {lead.tags.map((tag) => (
                    <span key={tag} className="bg-accent text-accent-foreground text-[10px] px-2 py-0.5 rounded-full font-medium">
                        {tag}
                    </span>
                ))}
            </div>

            {lead.nextAction && (
                <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-border/50 text-xs text-muted-foreground">
                    <Calendar className="w-3.5 h-3.5" />
                    <span className="font-medium">{lead.nextAction}</span>
                    <span className="opacity-70 ml-auto text-[10px]">
                        {new Date(lead.nextActionDate).toLocaleDateString()}
                    </span>
                </div>
            )}
        </div>
    );
}
