"use client";

import { useState, useEffect } from "react";
import {
    Drawer,
    DrawerClose,
    DrawerContent,
    DrawerDescription,
    DrawerHeader,
    DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Lead, LinkItem } from "@/types";
import { Linkedin, Phone, MessageSquare, ExternalLink, Copy, X, Mail, Github, Twitter, Link as LinkIcon, Plus, Trash2 } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";

interface LeadDrawerProps {
    lead: Lead | null;
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: (id: string, updates: Partial<Lead>) => void;
    onDelete: (id: string) => void;
}

export function LeadDrawer({ lead, isOpen, onOpenChange, onSave, onDelete }: LeadDrawerProps) {
    const columns = useAppStore((state) => state.columns);
    const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

    const [notes, setNotes] = useState(lead?.notes || "");
    const [nextAction, setNextAction] = useState(lead?.nextAction || "");
    const [nextActionDate, setNextActionDate] = useState(
        lead?.nextActionDate || ""
    );
    const [columnId, setColumnId] = useState(lead?.columnId || "novo");
    const [email, setEmail] = useState(lead?.email || "");

    const [links, setLinks] = useState<LinkItem[]>(lead?.links || []);
    const [newLinkLabel, setNewLinkLabel] = useState("");
    const [newLinkUrl, setNewLinkUrl] = useState("");

    useEffect(() => {
        if (lead) {
            setNotes(lead.notes || "");
            setNextAction(lead.nextAction || "");
            setNextActionDate(lead.nextActionDate || "");
            setColumnId(lead.columnId || "novo");
            setEmail(lead.email || "");
            setLinks(lead.links || []);
            setIsConfirmingDelete(false);
        }
    }, [lead]);

    // Auto-save mechanism via debounce
    useEffect(() => {
        if (!lead || !isOpen) return;

        const handler = setTimeout(() => {
            const updates: Partial<Lead> = {};
            if (notes !== (lead.notes || "")) updates.notes = notes;
            if (nextAction !== (lead.nextAction || "")) updates.nextAction = nextAction;
            if (columnId !== (lead.columnId || "novo")) updates.columnId = columnId;
            if (email !== (lead.email || "")) updates.email = email;
            if (nextActionDate !== (lead.nextActionDate || "")) updates.nextActionDate = nextActionDate;

            if (Object.keys(updates).length > 0) {
                onSave(lead.id, updates);
            }
        }, 1000);

        return () => clearTimeout(handler);
    }, [notes, nextAction, columnId, email, nextActionDate, lead, isOpen, onSave]);

    if (!lead) return null;

    const handleAddLink = () => {
        if (!newLinkUrl) return;
        const newLink: LinkItem = {
            id: Date.now().toString(),
            label: newLinkLabel || newLinkUrl,
            url: newLinkUrl
        };
        const updatedLinks = [...links, newLink];
        setLinks(updatedLinks);
        onSave(lead.id, { links: updatedLinks });
        setNewLinkLabel("");
        setNewLinkUrl("");
    };

    const handleRemoveLink = (id: string) => {
        const updatedLinks = links.filter(l => l.id !== id);
        setLinks(updatedLinks);
        onSave(lead.id, { links: updatedLinks });
    };

    const getIconForUrl = (url: string) => {
        const lurl = url.toLowerCase();
        if (lurl.includes("github.com")) return <Github className="w-4 h-4 text-muted-foreground" />;
        if (lurl.includes("twitter.com") || lurl.includes("x.com")) return <Twitter className="w-4 h-4 text-muted-foreground" />;
        return <LinkIcon className="w-4 h-4 text-muted-foreground" />;
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

                <div className="flex-1 overflow-y-auto px-4 pb-8 space-y-6">
                    {/* Quick Actions */}
                    <div className="flex gap-2">
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
                        {email && (
                            <Button className="flex-1 rounded-2xl bg-primary hover:bg-primary/90 text-white" asChild>
                                <a href={`mailto:${email}`} target="_blank" rel="noreferrer">
                                    <Mail className="w-4 h-4 mr-2" />
                                    Email
                                </a>
                            </Button>
                        )}
                    </div>

                    <div className="bg-accent/40 rounded-3xl p-4 space-y-4">
                        <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Cadence & Flux <span className="text-[10px] font-normal lowercase ml-2 opacity-60">(auto-saves)</span></h3>

                        <div className="space-y-3">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-medium text-muted-foreground">Kanban Column</label>
                                <select
                                    value={columnId}
                                    onChange={(e) => setColumnId(e.target.value)}
                                    className="h-9 w-full rounded-xl bg-background border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                >
                                    {columns.map(col => (
                                        <option key={col.id} value={col.id}>{col.title}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-medium text-muted-foreground">Next Action</label>
                                    <Input
                                        type="text"
                                        value={nextAction}
                                        onChange={(e) => setNextAction(e.target.value)}
                                        placeholder="e.g. Call, Email..."
                                        className="rounded-xl h-9"
                                    />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-medium text-muted-foreground">Action Date</label>
                                    <Input
                                        type="date"
                                        value={nextActionDate}
                                        onChange={(e) => setNextActionDate(e.target.value)}
                                        className="rounded-xl h-9 w-full"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-accent/40 rounded-3xl p-4 space-y-4">
                        <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Contact Details</h3>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-medium text-muted-foreground">Email</label>
                            <Input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="lead@company.com"
                                className="rounded-xl h-9 bg-background"
                            />
                        </div>

                        <div className="pt-2 flex flex-col gap-3">
                            {lead.phones.map((phone, i) => (
                                <div key={i} className="flex items-center justify-between text-sm bg-background p-2 rounded-xl">
                                    <div className="flex items-center gap-3">
                                        <Phone className="w-4 h-4 text-muted-foreground" />
                                        <a href={`tel:${phone}`} className="font-medium hover:text-primary transition-colors">{phone}</a>
                                    </div>
                                    <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full" onClick={() => navigator.clipboard.writeText(phone)}>
                                        <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                                    </Button>
                                </div>
                            ))}

                            <div className="flex items-center justify-between text-sm bg-background p-2 rounded-xl">
                                <div className="flex items-center gap-3">
                                    <Linkedin className="w-4 h-4 text-muted-foreground" />
                                    <a href={lead.linkedInUrl} target="_blank" rel="noreferrer" className="max-w-[170px] truncate block font-medium hover:text-primary transition-colors">
                                        {lead.linkedInUrl}
                                    </a>
                                </div>
                                <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full" asChild>
                                    <a href={lead.linkedInUrl} target="_blank" rel="noreferrer">
                                        <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                                    </a>
                                </Button>
                            </div>
                            
                            {/* Arbitrary Links */}
                            {links.map((link) => (
                                <div key={link.id} className="flex items-center justify-between text-sm bg-background p-2 rounded-xl group">
                                    <div className="flex items-center gap-3">
                                        {getIconForUrl(link.url)}
                                        <a href={link.url} target="_blank" rel="noreferrer" className="max-w-[170px] truncate block font-medium hover:text-primary transition-colors">
                                            {link.label || link.url}
                                        </a>
                                    </div>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleRemoveLink(link.id)}>
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full" asChild>
                                            <a href={link.url} target="_blank" rel="noreferrer">
                                                <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                                            </a>
                                        </Button>
                                    </div>
                                </div>
                            ))}
                            
                            {/* Add Link */}
                            <div className="flex items-center gap-2 mt-1">
                                <Input 
                                    placeholder="Label (opt)" 
                                    className="h-8 text-xs rounded-lg bg-background w-1/3" 
                                    value={newLinkLabel} 
                                    onChange={(e) => setNewLinkLabel(e.target.value)}
                                />
                                <Input 
                                    placeholder="URL (https://...)" 
                                    className="h-8 text-xs rounded-lg bg-background flex-1" 
                                    value={newLinkUrl} 
                                    onChange={(e) => setNewLinkUrl(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleAddLink()}
                                />
                                <Button size="icon" className="h-8 w-8 shrink-0 rounded-lg" onClick={handleAddLink}>
                                    <Plus className="w-4 h-4" />
                                </Button>
                            </div>
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

                {/* Delete Footer */}
                <div className="px-4 pb-6 pt-2 border-t border-border/40 shrink-0">
                    {isConfirmingDelete ? (
                        <div className="flex gap-2">
                            <button
                                onClick={() => onDelete(lead.id)}
                                className="flex-1 h-9 rounded-xl text-sm font-semibold bg-destructive hover:bg-destructive/90 text-white transition-colors"
                            >
                                Confirmar exclusão
                            </button>
                            <button
                                onClick={() => setIsConfirmingDelete(false)}
                                className="flex-1 h-9 rounded-xl text-sm font-medium border border-border hover:bg-accent transition-colors"
                            >
                                Cancelar
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={() => setIsConfirmingDelete(true)}
                            className="w-full h-9 rounded-xl text-sm font-medium text-destructive/70 hover:text-destructive hover:bg-destructive/10 transition-colors flex items-center justify-center gap-2"
                        >
                            <Trash2 className="w-4 h-4" /> Deletar lead
                        </button>
                    )}
                </div>
            </DrawerContent>
        </Drawer>
    );
}
