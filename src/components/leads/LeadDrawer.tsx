"use client";

import { useState } from "react";
import {
    Drawer,
    DrawerClose,
    DrawerContent,
    DrawerDescription,
    DrawerFooter,
    DrawerHeader,
    DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Lead } from "@/types";
import { Linkedin, Phone, MessageSquare, Link as LinkIcon, ExternalLink, Copy, X } from "lucide-react";

interface LeadDrawerProps {
    lead: Lead | null;
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: (id: string, updates: Partial<Lead>) => void;
}

export function LeadDrawer({ lead, isOpen, onOpenChange, onSave }: LeadDrawerProps) {
    const [notes, setNotes] = useState(lead?.notes || "");

    if (!lead) return null;

    const handleSave = () => {
        if (notes !== lead.notes) {
            onSave(lead.id, { notes });
        }
        // onClose trigger automatically by Drawer logic
    };

    return (
        <Drawer open={isOpen} onOpenChange={onOpenChange} direction="right">
            <DrawerContent className="inset-x-auto right-0 mt-0 w-full sm:w-[500px] h-screen rounded-none rounded-l-[2rem] border-l outline-none flex flex-col pt-6 font-sans">
                <DrawerHeader className="text-left pb-2 flex justify-between items-start">
                    <div>
                        <DrawerTitle className="text-2xl font-bold">{lead.name}</DrawerTitle>
                        <DrawerDescription className="text-base mt-1 text-muted-foreground flex items-center gap-2">
                            {lead.role} at <span className="font-medium text-foreground">{lead.company}</span>
                        </DrawerDescription>
                    </div>
                    <DrawerClose asChild>
                        <Button variant="ghost" size="icon" className="rounded-full shrink-0 -mt-2 -mr-2 text-muted-foreground hover:text-foreground">
                            <X className="w-5 h-5" />
                        </Button>
                    </DrawerClose>
                </DrawerHeader>

                <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-6">
                    {/* Quick Actions */}
                    <div className="flex gap-2 mb-2">
                        <Button className="flex-1 rounded-2xl bg-[#0A66C2] hover:bg-[#0A66C2]/90 text-white" asChild>
                            <a href={lead.linkedInUrl} target="_blank" rel="noreferrer">
                                <Linkedin className="w-4 h-4 mr-2" />
                                LinkedIn
                            </a>
                        </Button>
                        {lead.whatsapps.length > 0 && (
                            <Button className="flex-1 rounded-2xl bg-[#25D366] hover:bg-[#25D366]/90 text-white" asChild>
                                <a href={`https://wa.me/${lead.whatsapps[0].replace(/\D/g, '')}`} target="_blank" rel="noreferrer">
                                    <MessageSquare className="w-4 h-4 mr-2" />
                                    WhatsApp
                                </a>
                            </Button>
                        )}
                    </div>

                    <div className="bg-accent/40 rounded-3xl p-4 space-y-4">
                        <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Contact Details</h3>

                        {lead.phones.map((phone, i) => (
                            <div key={i} className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-3">
                                    <Phone className="w-4 h-4 text-muted-foreground" />
                                    <a href={`tel:${phone}`} className="font-medium hover:text-primary transition-colors">{phone}</a>
                                </div>
                                <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full" onClick={() => navigator.clipboard.writeText(phone)}>
                                    <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                                </Button>
                            </div>
                        ))}

                        <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-3">
                                <Linkedin className="w-4 h-4 text-muted-foreground" />
                                <a href={lead.linkedInUrl} target="_blank" rel="noreferrer" className="max-w-[200px] truncate block font-medium hover:text-primary transition-colors">
                                    {lead.linkedInUrl}
                                </a>
                            </div>
                            <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full" asChild>
                                <a href={lead.linkedInUrl} target="_blank" rel="noreferrer">
                                    <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                                </a>
                            </Button>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground ml-1">Notes & History</h3>
                        <Textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Add notes, context, or interaction history..."
                            className="resize-none h-40 rounded-2xl bg-accent/40 border-transparent focus:border-primary/50 focus:bg-background transition-colors"
                        />
                    </div>
                </div>

                <DrawerFooter className="border-t bg-background pt-4 pb-6 mt-auto">
                    <Button onClick={handleSave} className="w-full rounded-2xl py-6 font-semibold bg-primary hover:bg-primary/90">
                        Save Changes
                    </Button>
                </DrawerFooter>
            </DrawerContent>
        </Drawer>
    );
}
