import { create } from 'zustand';
import { Lead, Template, Column } from '@/types';
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

export const defaultColumns: Column[] = [
    { id: 'novo', title: 'Novos' },
    { id: 'contactado', title: 'Abordagem enviada' },
    { id: 'respondeu', title: 'Respondeu' },
    { id: 'fup1', title: 'Follow-up 1' },
    { id: 'fup2', title: 'Follow-up 2' },
    { id: 'call', title: 'Agendar call' },
    { id: 'paused', title: 'Sem fit/Pausado' },
    { id: 'closed', title: 'Fechado' },
];

interface AppState {
    leads: Lead[];
    columns: Column[];
    templates: Template[];
    searchQuery: string;
    loading: boolean;
    _hasHydrated: boolean;
    setSearchQuery: (query: string) => void;
    fetchLeads: () => Promise<void>;
    seedData: () => Promise<void>;
    importData: (data: { leads: Lead[]; templates?: Template[]; columns?: Column[] }) => Promise<void>;
    addLead: (lead: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
    updateLead: (id: string, updates: Partial<Lead>) => Promise<void>;
    deleteLead: (id: string) => Promise<void>;
    moveLead: (leadId: string, toColumnId: string) => Promise<void>;
    addColumn: (title: string) => void;
    updateColumn: (id: string, title: string) => void;
    deleteColumn: (id: string) => void;
    addTemplate: (template: Omit<Template, 'id'>) => void;
    updateTemplate: (id: string, updates: Partial<Template>) => void;
    deleteTemplate: (id: string) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
    leads: [],
    columns: defaultColumns,
    templates: [],
    searchQuery: '',
    loading: false,
    _hasHydrated: true,

    setSearchQuery: (query) => set({ searchQuery: query }),

    seedData: async () => {
        await get().fetchLeads();
    },

    importData: async (data) => {
        if (data.templates) {
            set({ templates: data.templates });
        }
        if (data.columns) {
            set({ columns: data.columns });
        }
        for (const lead of data.leads) {
            await get().addLead({
                name: lead.name,
                company: lead.company,
                role: lead.role,
                priority: lead.priority,
                tags: lead.tags,
                nextAction: lead.nextAction,
                nextActionDate: lead.nextActionDate,
                linkedInUrl: lead.linkedInUrl,
                phones: lead.phones,
                whatsapps: lead.whatsapps,
                email: lead.email,
                links: lead.links,
                notes: lead.notes,
                history: lead.history,
                columnId: lead.columnId,
                enrichmentStatus: lead.enrichmentStatus,
                enrichmentScore: lead.enrichmentScore,
            });
        }
    },

    fetchLeads: async () => {
        set({ loading: true });
        const { data, error } = await supabase
            .from('contacts')
            .select('*')
            .order('created_at', { ascending: false });

        if (!error && data) {
            // Map Supabase 'contacts' to 'Lead' type
            const mappedLeads: Lead[] = data.map((c: any) => ({
                id: c.id,
                name: c.name,
                company: c.company || '',
                role: c.title || '',
                priority: (c.raw_sources?.priority as any) || 'Média',
                tags: c.tags || [],
                nextAction: c.raw_sources?.next_action || '',
                nextActionDate: c.raw_sources?.next_action_date || '',
                linkedInUrl: c.linkedin_url || '',
                phones: c.phone ? [c.phone] : [],
                whatsapps: c.whatsapp ? [c.whatsapp] : [],
                email: c.email || '',
                links: [], // Could be mapped from raw_sources if needed
                notes: c.raw_sources?.notes || '',
                history: [],
                columnId: c.stage || 'novo',
                createdAt: c.created_at,
                updatedAt: c.created_at, // Supabase might not have updatedAt yet
                enrichmentStatus: c.enrichment_status,
                enrichmentScore: c.overall_confidence
            }));
            set({ leads: mappedLeads });
        }
        set({ loading: false });
    },

    addLead: async (leadData) => {
        const { data, error } = await supabase
            .from('contacts')
            .insert([{
                name: leadData.name,
                title: leadData.role,
                company: leadData.company,
                linkedin_url: leadData.linkedInUrl,
                stage: leadData.columnId || 'novo',
                email: leadData.email,
                phone: leadData.phones[0],
                whatsapp: leadData.whatsapps[0],
                tags: leadData.tags,
                raw_sources: {
                    notes: leadData.notes,
                    next_action: leadData.nextAction,
                    next_action_date: leadData.nextActionDate,
                    priority: leadData.priority
                }
            }])
            .select();

        if (!error && data) {
            await get().fetchLeads();
        }
    },

    updateLead: async (id, updates) => {
        const lead = get().leads.find(l => l.id === id);
        if (!lead) return;

        // Prepare update object for Supabase
        const supabaseUpdate: any = {};
        if (updates.name !== undefined) supabaseUpdate.name = updates.name;
        if (updates.role !== undefined) supabaseUpdate.title = updates.role;
        if (updates.company !== undefined) supabaseUpdate.company = updates.company;
        if (updates.columnId !== undefined) supabaseUpdate.stage = updates.columnId;
        if (updates.email !== undefined) supabaseUpdate.email = updates.email;
        if (updates.linkedInUrl !== undefined) supabaseUpdate.linkedin_url = updates.linkedInUrl;

        // Handle raw_sources updates (merging with existing)
        const newRawSources = { ...(lead as any).raw_sources || {} };
        let hasRawUpdate = false;
        
        if (updates.notes !== undefined) { newRawSources.notes = updates.notes; hasRawUpdate = true; }
        if (updates.nextAction !== undefined) { newRawSources.next_action = updates.nextAction; hasRawUpdate = true; }
        if (updates.nextActionDate !== undefined) { newRawSources.next_action_date = updates.nextActionDate; hasRawUpdate = true; }
        if (updates.priority !== undefined) { newRawSources.priority = updates.priority; hasRawUpdate = true; }

        if (hasRawUpdate) supabaseUpdate.raw_sources = newRawSources;

        const { error } = await supabase
            .from('contacts')
            .update(supabaseUpdate)
            .eq('id', id);

        if (!error) {
            // Optimistic update
            set((state) => ({
                leads: state.leads.map((l) =>
                    l.id === id ? { ...l, ...updates, updatedAt: new Date().toISOString() } : l
                ),
            }));
        }
    },

    deleteLead: async (id) => {
        const { error } = await supabase
            .from('contacts')
            .delete()
            .eq('id', id);

        if (!error) {
            set((state) => ({ leads: state.leads.filter((l) => l.id !== id) }));
        }
    },

    moveLead: async (leadId, toColumnId) => {
        const { error } = await supabase
            .from('contacts')
            .update({ stage: toColumnId })
            .eq('id', leadId);

        if (!error) {
            set((state) => ({
                leads: state.leads.map((l) =>
                    l.id === leadId ? { ...l, columnId: toColumnId, updatedAt: new Date().toISOString() } : l
                ),
            }));
        }
    },

    addColumn: (title) => {
        const id = title.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now();
        set((state) => ({ columns: [...state.columns, { id, title }] }));
    },

    updateColumn: (id, title) => {
        set((state) => ({
            columns: state.columns.map((c) => (c.id === id ? { ...c, title } : c)),
        }));
    },

    deleteColumn: (id) => {
        set((state) => ({ columns: state.columns.filter((c) => c.id !== id) }));
    },

    addTemplate: (tempData) => {
        // Templates still local for now, or could be moved to DB later
        const newTemplate: Template = {
            ...tempData,
            id: crypto.randomUUID(),
        };
        set((state) => ({ templates: [...state.templates, newTemplate] }));
    },

    updateTemplate: (id, updates) => {
        set((state) => ({
            templates: state.templates.map((t) => (t.id === id ? { ...t, ...updates } : t)),
        }));
    },

    deleteTemplate: (id) => {
        set((state) => ({ templates: state.templates.filter((t) => t.id !== id) }));
    },
}));
