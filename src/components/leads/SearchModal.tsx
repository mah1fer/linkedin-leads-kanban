"use client";

import { useState, useEffect, useMemo } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Loader2, Linkedin, UserPlus, CheckCircle2, Link2, Users, Briefcase, Building2, Tag } from "lucide-react";
import { useAppStore, defaultColumns } from "@/store/useAppStore";
import { Lead } from "@/types";

interface SearchModalProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
}

interface SearchResult {
    name: string;
    url: string;
    role: string;
}

export function SearchModal({ isOpen, onOpenChange }: SearchModalProps) {
    // Local search state
    const [localQuery, setLocalQuery] = useState("");

    // Link import state
    const [linkQuery, setLinkQuery] = useState("");

    // Extension search state
    const [searchQuery, setSearchQuery] = useState("");
    const [isImporting, setIsImporting] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [results, setResults] = useState<SearchResult[]>([]);
    const [addedSet, setAddedSet] = useState<Set<string>>(new Set());
    const [isExtensionReady, setIsExtensionReady] = useState(false);
    const [extensionError, setExtensionError] = useState<string | null>(null);
    const [importStatus, setImportStatus] = useState<"idle" | "success" | "error">("idle");

    const addLead = useAppStore(state => state.addLead);
    const leads = useAppStore(state => state.leads);
    const columns = useAppStore(state => state.columns);

    // ─── Local Search (filters existing leads) ───────────────────────────────
    const localResults = useMemo(() => {
        if (!localQuery.trim()) return [];
        const q = localQuery.toLowerCase().trim();
        return leads.filter(
            (l) =>
                l.name.toLowerCase().includes(q) ||
                l.company.toLowerCase().includes(q) ||
                l.role.toLowerCase().includes(q) ||
                l.tags.some((t) => t.toLowerCase().includes(q)) ||
                (l.email && l.email.toLowerCase().includes(q)) ||
                l.linkedInUrl.toLowerCase().includes(q)
        );
    }, [leads, localQuery]);

    // ─── Callback to click a local result and open its drawer ────────────────
    const [selectedLocalLead, setSelectedLocalLead] = useState<Lead | null>(null);

    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (event.data?.type === "KANBAN_EXT_READY") {
                setIsExtensionReady(true);
                setExtensionError(null);
            }
            if (event.data?.type === "KANBAN_EXT_DEAD") {
                setIsExtensionReady(false);
                setExtensionError("Extensão desconectada. Recarregue a extensão no Chrome (chrome://extensions).");
            }
            if (event.data?.type === "KANBAN_EXT_ERROR") {
                setExtensionError("Extensão desconectada. Recarregue a extensão e atualize esta página.");
                // Stop any pending operations
                setIsImporting(false);
                setIsSearching(false);
                setImportStatus("error");
            }
        };
        window.addEventListener("message", handleMessage);
        const pingInterval = setInterval(() => {
            if (!isExtensionReady) window.postMessage({ type: "KANBAN_EXT_PING" }, "*");
            else clearInterval(pingInterval);
        }, 1500);
        window.postMessage({ type: "KANBAN_EXT_PING" }, "*");
        return () => {
            window.removeEventListener("message", handleMessage);
            clearInterval(pingInterval);
        };
    }, [isExtensionReady]);

    // ─── Direct Link Import ───────────────────────────────────────────────────
    const handleDirectImport = () => {
        const url = linkQuery.trim();
        if (!url || !url.includes("linkedin.com/in/")) return;

        setIsImporting(true);
        setImportStatus("idle");
        const id = Date.now().toString();

        const timeout = setTimeout(() => {
            window.removeEventListener("message", listener);
            setIsImporting(false);
            setImportStatus("error");
        }, 90000); // 90s timeout

        const listener = (event: MessageEvent) => {
            if (event.data?.type === "KANBAN_EXT_RESPONSE" && event.data.id === id) {
                clearTimeout(timeout);
                window.removeEventListener("message", listener);
                setIsImporting(false);

                const lead = event.data.payload;
                if (!lead) { setImportStatus("error"); return; }

                const targetColumn = columns.length > 0 ? columns[0].id : defaultColumns[0].id;
                addLead({
                    name: lead.name || "Sem Nome",
                    role: lead.role || "",
                    company: lead.company || "",
                    linkedInUrl: url,
                    priority: "Alta",
                    tags: ["Importação Direta"],
                    nextAction: "Qualificar Lead",
                    nextActionDate: new Date().toISOString(),
                    notes: "Importado via Link Profissional.",
                    phones: lead.phones || [],
                    whatsapps: lead.whatsapps || [],
                    email: lead.email || "",
                    links: (lead.links || []).map((u: string) => ({
                        id: Math.random().toString(36).substr(2, 9),
                        label: "Website",
                        url: u
                    })),
                    history: [],
                    columnId: targetColumn
                });
                setImportStatus("success");
                setLinkQuery("");
                setTimeout(() => setImportStatus("idle"), 3000);
            }
            // Catch extension errors immediately
            if (event.data?.type === "KANBAN_EXT_ERROR" && event.data.id === id) {
                clearTimeout(timeout);
                window.removeEventListener("message", listener);
                setIsImporting(false);
                setImportStatus("error");
            }
        };

        window.addEventListener("message", listener);
        window.postMessage({
            type: "KANBAN_EXT_REQUEST",
            id,
            payload: { action: "IMPORT_BY_LINK", url }
        }, "*");
    };

    // ─── Extension Name/Keyword Search ────────────────────────────────────────
    const handleSearch = () => {
        if (!searchQuery.trim()) return;
        setIsSearching(true);
        setResults([]);
        setAddedSet(new Set());

        const id = Date.now().toString();
        const listener = (event: MessageEvent) => {
            if (event.data?.type === "KANBAN_EXT_RESPONSE" && event.data.id === id) {
                window.removeEventListener("message", listener);
                setIsSearching(false);
                setResults(event.data.payload || []);
            }
            // Catch extension errors immediately
            if (event.data?.type === "KANBAN_EXT_ERROR" && event.data.id === id) {
                window.removeEventListener("message", listener);
                setIsSearching(false);
            }
        };
        window.addEventListener("message", listener);
        setTimeout(() => {
            window.removeEventListener("message", listener);
            setIsSearching(false);
        }, 60000);

        window.postMessage({
            type: "KANBAN_EXT_REQUEST",
            id,
            payload: { action: "SEARCH_LINKEDIN", query: searchQuery }
        }, "*");
    };

    const handleAddLead = (profile: SearchResult) => {
        const targetColumn = columns.length > 0 ? columns[0].id : defaultColumns[0].id;
        addLead({
            name: profile.name,
            role: profile.role,
            company: "",
            linkedInUrl: profile.url,
            priority: "Média",
            tags: ["Prospect"],
            nextAction: "Analisar Perfil",
            nextActionDate: new Date().toISOString(),
            notes: "Importado via Smart Search.",
            phones: [],
            whatsapps: [],
            email: "",
            links: [],
            history: [],
            columnId: targetColumn
        });
        const newSet = new Set(addedSet);
        newSet.add(profile.url);
        setAddedSet(newSet);
    };

    // Helper: get column name by id
    const getColumnName = (colId: string) => {
        const col = columns.find(c => c.id === colId);
        return col?.title ?? "—";
    };

    // Priority badge styles
    const priorityBadge: Record<string, string> = {
        Alta: "bg-destructive/10 text-destructive",
        Média: "bg-orange-400/10 text-orange-500",
        Baixa: "bg-primary/10 text-primary",
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[620px] border-border bg-card gap-0 p-0 overflow-hidden">
                <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/50">
                    <DialogTitle className="flex items-center gap-2">
                        <Search className="w-5 h-5 text-primary" />
                        Smart Search
                    </DialogTitle>
                    <DialogDescription>
                        Busque leads existentes, importe via link ou pesquise no LinkedIn.
                    </DialogDescription>
                </DialogHeader>

                <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto">

                    {/* ═══ Section 1: Local Lead Search ═══ */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-primary" />
                            <span className="text-xs font-bold uppercase tracking-wider text-primary">Buscar nos Leads</span>
                            <span className="text-[10px] text-muted-foreground ml-auto">{leads.length} leads no total</span>
                        </div>
                        <Input
                            placeholder="Buscar por nome, empresa, cargo, tag ou email..."
                            value={localQuery}
                            onChange={(e) => setLocalQuery(e.target.value)}
                            className="h-10 rounded-xl bg-background"
                            autoFocus
                        />

                        {localQuery.trim() && localResults.length === 0 && (
                            <div className="py-4 text-center text-muted-foreground text-xs">
                                Nenhum lead encontrado para &ldquo;{localQuery}&rdquo;.
                            </div>
                        )}

                        {localResults.length > 0 && (
                            <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                                    {localResults.length} resultado{localResults.length !== 1 ? "s" : ""}
                                </p>
                                {localResults.map((lead) => (
                                    <div
                                        key={lead.id}
                                        className="p-3 rounded-xl border border-border/50 bg-accent/20 flex items-center justify-between gap-3 hover:border-primary/30 transition-colors cursor-pointer group"
                                        onClick={() => {
                                            // Set the search in the global store so the board highlights it
                                            useAppStore.getState().setSearchQuery(lead.name);
                                            onOpenChange(false);
                                        }}
                                    >
                                        <div className="overflow-hidden flex-1 min-w-0">
                                            <p className="font-semibold text-[13px] truncate group-hover:text-primary transition-colors">{lead.name}</p>
                                            <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-0.5">
                                                {lead.role && (
                                                    <span className="flex items-center gap-1 truncate">
                                                        <Briefcase className="w-3 h-3 shrink-0 opacity-60" />
                                                        <span className="truncate">{lead.role}</span>
                                                    </span>
                                                )}
                                                {lead.company && (
                                                    <span className="flex items-center gap-1 truncate shrink-0">
                                                        <Building2 className="w-3 h-3 shrink-0 opacity-60" />
                                                        <span className="truncate max-w-[90px]">{lead.company}</span>
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            {lead.tags.length > 0 && (
                                                <div className="hidden sm:flex items-center gap-1">
                                                    <Tag className="w-3 h-3 text-muted-foreground/50" />
                                                    <span className="text-[10px] text-muted-foreground truncate max-w-[80px]">{lead.tags[0]}</span>
                                                </div>
                                            )}
                                            <span className={`text-[9px] px-1.5 py-0.5 font-bold uppercase tracking-widest rounded-sm ${priorityBadge[lead.priority] ?? ""}`}>
                                                {lead.priority}
                                            </span>
                                            <span className="text-[10px] text-muted-foreground/60 whitespace-nowrap">
                                                {getColumnName(lead.columnId)}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* ═══ Separator ═══ */}
                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-border/50" />
                        </div>
                        <div className="relative flex justify-center">
                            <span className="px-3 bg-card text-[10px] uppercase font-bold text-muted-foreground">importar do linkedin</span>
                        </div>
                    </div>

                    {/* ═══ Section 2: Direct Link Import ═══ */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <Link2 className="w-4 h-4 text-primary" />
                            <span className="text-xs font-bold uppercase tracking-wider text-primary">Importar via Link</span>
                        </div>
                        <div className="flex gap-2">
                            <Input
                                placeholder="https://linkedin.com/in/nome-do-perfil"
                                value={linkQuery}
                                onChange={(e) => setLinkQuery(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleDirectImport()}
                                className="h-10 rounded-xl bg-background"
                                disabled={isImporting}
                            />
                            <Button
                                onClick={handleDirectImport}
                                disabled={isImporting || !linkQuery.includes("linkedin.com/in/")}
                                className="h-10 px-5 rounded-xl bg-primary text-white shrink-0"
                            >
                                {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Importar"}
                            </Button>
                        </div>

                        {isImporting && (
                            <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-xl border border-primary/10 text-sm text-muted-foreground">
                                <div className="relative shrink-0">
                                    <Loader2 className="w-5 h-5 animate-spin text-primary/40" />
                                    <Linkedin className="w-2.5 h-2.5 text-primary absolute inset-[4px]" />
                                </div>
                                <span className="text-xs">Navegando no perfil e extraindo dados... (6-10s)</span>
                            </div>
                        )}

                        {importStatus === "success" && (
                            <div className="flex items-center gap-2 p-3 bg-green-500/10 text-green-600 text-sm rounded-xl border border-green-500/20">
                                <CheckCircle2 className="w-4 h-4" />
                                Lead importado com sucesso! Verifique a coluna &ldquo;Novos&rdquo;.
                            </div>
                        )}

                        {importStatus === "error" && (
                            <div className="p-3 bg-destructive/10 text-destructive text-xs rounded-xl border border-destructive/20">
                                Não foi possível extrair os dados. Verifique se está logado no LinkedIn e recarregue a extensão.
                            </div>
                        )}
                    </div>

                    {/* ═══ Separator ═══ */}
                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-border/50" />
                        </div>
                        <div className="relative flex justify-center">
                            <span className="px-3 bg-card text-[10px] uppercase font-bold text-muted-foreground">ou buscar no linkedin</span>
                        </div>
                    </div>

                    {/* ═══ Section 3: Extension-Based LinkedIn Name Search ═══ */}
                    {!isExtensionReady ? (
                        <div className="bg-accent/50 text-muted-foreground p-4 rounded-xl text-xs text-center border border-border/50 space-y-2">
                            {extensionError ? (
                                <>
                                    <p className="text-destructive font-semibold">⚠️ {extensionError}</p>
                                    <p className="text-[10px] opacity-70">Após recarregar, atualize esta página (F5).</p>
                                </>
                            ) : (
                                <p>Extensão não detectada. <span className="font-semibold text-foreground">Instale e recarregue</span> a extensão para usar a busca por nome no LinkedIn.</p>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <div className="flex gap-2">
                                <Input
                                    placeholder="ex: CTO Itaú, Gerente de TI..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                                    className="h-10 rounded-xl"
                                    disabled={isSearching}
                                />
                                <Button
                                    onClick={handleSearch}
                                    disabled={isSearching || !searchQuery}
                                    className="h-10 px-5 rounded-xl shrink-0"
                                    variant="secondary"
                                >
                                    {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : "Buscar"}
                                </Button>
                            </div>

                            {isSearching && (
                                <div className="py-8 flex flex-col items-center gap-2 text-muted-foreground text-center">
                                    <Loader2 className="w-6 h-6 animate-spin text-primary/50" />
                                    <p className="text-xs">Pesquisando no LinkedIn...</p>
                                    <p className="text-[10px] opacity-60">Certifique-se de estar logado no LinkedIn.</p>
                                </div>
                            )}

                            {!isSearching && results.length > 0 && (
                                <div className="space-y-1.5 max-h-[260px] overflow-y-auto pr-1">
                                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                                        {results.length} resultados
                                    </p>
                                    {results.map((profile, i) => {
                                        const isAdded = addedSet.has(profile.url);
                                        return (
                                            <div key={i} className="p-3 rounded-xl border border-border/50 bg-accent/20 flex items-center justify-between gap-3 hover:border-primary/30 transition-colors">
                                                <div className="overflow-hidden">
                                                    <p className="font-semibold text-[13px] truncate">{profile.name}</p>
                                                    <p className="text-[11px] text-muted-foreground truncate">{profile.role}</p>
                                                </div>
                                                <Button
                                                    size="sm"
                                                    variant={isAdded ? "secondary" : "default"}
                                                    onClick={() => handleAddLead(profile)}
                                                    disabled={isAdded}
                                                    className="h-8 rounded-lg text-xs shrink-0"
                                                >
                                                    {isAdded ? (
                                                        <><CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Adicionado</>
                                                    ) : (
                                                        <><UserPlus className="w-3.5 h-3.5 mr-1" /> Importar</>
                                                    )}
                                                </Button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
