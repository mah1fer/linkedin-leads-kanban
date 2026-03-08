"use client";

import { useMemo, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
    DndContext,
    DragOverlay,
    closestCorners,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragStartEvent,
    DragOverEvent,
    DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { useAppStore } from "@/store/useAppStore";
import { Column as ColumnComponent } from "./Column";
import { LeadCard } from "./LeadCard";
import { LeadDrawer } from "@/components/leads/LeadDrawer";
import { Lead, Column } from "@/types";

export function Board() {
    const columns = useAppStore((state) => state.columns);
    const leads = useAppStore((state) => state.leads);
    const moveLead = useAppStore((state) => state.moveLead);
    const updateLead = useAppStore((state) => state.updateLead);
    const deleteLead = useAppStore((state) => state.deleteLead);
    const searchQuery = useAppStore((state) => state.searchQuery);

    const fetchLeads = useAppStore((state) => state.fetchLeads);
    const loading = useAppStore((state) => state.loading);

    const [activeColumn, setActiveColumn] = useState<Column | null>(null);
    const [activeLead, setActiveLead] = useState<Lead | null>(null);

    const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    // Initial fetch
    useEffect(() => {
        fetchLeads();
    }, [fetchLeads]);

    // Filter leads based on search query
    const filteredLeads = useMemo(() => {
        if (!searchQuery) return leads;
        const q = searchQuery.toLowerCase();
        return leads.filter(
            (l) =>
                l.name.toLowerCase().includes(q) ||
                l.company.toLowerCase().includes(q) ||
                l.role.toLowerCase().includes(q) ||
                l.tags.some((t) => t.toLowerCase().includes(q))
        );
    }, [leads, searchQuery]);

    const columnsId = useMemo(() => columns.map((c) => c.id), [columns]);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 10 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    function onDragStart(event: DragStartEvent) {
        if (event.active.data.current?.type === "Column") {
            setActiveColumn(event.active.data.current.column);
            return;
        }
        if (event.active.data.current?.type === "Card") {
            setActiveLead(event.active.data.current.lead);
            return;
        }
    }

    function onDragEnd(event: DragEndEvent) {
        setActiveColumn(null);
        setActiveLead(null);

        const { active, over } = event;
        if (!over) return;

        // Moving leads between cards or directly to a column
        const activeId = active.id.toString();
        const overId = over.id.toString();

        if (activeId === overId) return;

        const isActiveACard = active.data.current?.type === "Card";
        const isOverACard = over.data.current?.type === "Card";
        const isOverAColumn = over.data.current?.type === "Column";

        if (!isActiveACard) return;

        // Dropping a Card over another Card
        if (isActiveACard && isOverACard) {
            const overLead = filteredLeads.find((l) => l.id === overId);
            if (overLead) {
                moveLead(activeId, overLead.columnId);
            }
            return;
        }

        // Dropping a Card over an empty Column
        if (isActiveACard && isOverAColumn) {
            moveLead(activeId, overId);
            return;
        }
    }

    if (loading && leads.length === 0) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="flex-1 w-full h-full overflow-x-auto overflow-y-hidden p-6 relative">
            <DndContext
                sensors={sensors}
                collisionDetection={closestCorners}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
            >
                <div className="flex gap-6 h-full items-start">
                    <SortableContext items={columnsId}>
                        {columns.map((col) => (
                            <ColumnComponent
                                key={col.id}
                                column={col}
                                leads={filteredLeads.filter((l) => l.columnId === col.id)}
                                onLeadClick={(lead) => {
                                    setSelectedLead(lead);
                                    setIsDrawerOpen(true);
                                }}
                                onLeadDelete={(id) => {
                                    deleteLead(id);
                                    if (selectedLead?.id === id) setIsDrawerOpen(false);
                                }}
                            />
                        ))}
                    </SortableContext>
                </div>

                {typeof document !== "undefined" &&
                    createPortal(
                        <DragOverlay>
                            {activeColumn && (
                                <div className="opacity-50">
                                    <ColumnComponent
                                        column={activeColumn}
                                        leads={filteredLeads.filter((l) => l.columnId === activeColumn.id)}
                                        onLeadClick={() => { }}
                                    />
                                </div>
                            )}
                            {activeLead && <LeadCard lead={activeLead} onClick={() => { }} onDelete={undefined} />}
                        </DragOverlay>,
                        document.body
                    )}
            </DndContext>

            <LeadDrawer
                lead={selectedLead}
                isOpen={isDrawerOpen}
                onOpenChange={setIsDrawerOpen}
                onSave={(id, updates) => {
                    updateLead(id, updates);
                }}
                onDelete={(id) => {
                    deleteLead(id);
                    setIsDrawerOpen(false);
                    setSelectedLead(null);
                }}
            />
        </div>
    );
}
