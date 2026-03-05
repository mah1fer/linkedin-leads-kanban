import { create } from 'zustand';
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware';
import localforage from 'localforage';
import { Lead, Template, Column } from '@/types';
import { v4 as uuidv4 } from 'uuid';

// Custom storage adapter for localforage
const storage: StateStorage = {
    getItem: async (name: string): Promise<string | null> => {
        return (await localforage.getItem<string>(name)) || null;
    },
    setItem: async (name: string, value: string): Promise<void> => {
        await localforage.setItem(name, value);
    },
    removeItem: async (name: string): Promise<void> => {
        await localforage.removeItem(name);
    },
};

export const defaultColumns: Column[] = [
    { id: 'col-new', title: 'Novos' },
    { id: 'col-approach', title: 'Abordagem enviada' },
    { id: 'col-replied', title: 'Respondeu' },
    { id: 'col-fup1', title: 'Follow-up 1' },
    { id: 'col-fup2', title: 'Follow-up 2' },
    { id: 'col-call', title: 'Agendar call' },
    { id: 'col-paused', title: 'Sem fit/Pausado' },
    { id: 'col-closed', title: 'Fechado' },
];

export const mockTemplates: Template[] = [
    { id: uuidv4(), name: 'Abordagem A', content: 'Olá {Nome}, vi que você é {Cargo} na {Empresa}. Gostaríamos de conversar sobre...' },
    { id: uuidv4(), name: 'Abordagem B', content: 'Fala {Nome}! A {Empresa} está com desafios na área? Sou especialista...' },
    { id: uuidv4(), name: 'Ponte', content: 'Olá {Nome}, quem seria a melhor pessoa na {Empresa} para tratar de TI?' },
    { id: uuidv4(), name: 'FUP 1', content: 'Oi {Nome}, conseguiu ver minha mensagem anterior sobre...' },
    { id: uuidv4(), name: 'CFO', content: 'Olá {Nome}, observando a {Empresa}, percebi oportunidades financeiras...' },
];

export const mockLeads: Lead[] = [
    {
        id: uuidv4(),
        name: 'João Silva',
        company: 'TechCorp',
        role: 'CTO',
        priority: 'Alta',
        tags: ['TI', 'Decisor'],
        nextAction: 'Ligar',
        nextActionDate: new Date().toISOString(),
        linkedInUrl: 'https://linkedin.com/in/joaosilva',
        phones: ['+5511999999999'],
        whatsapps: ['+5511999999999'],
        links: [],
        notes: 'Pareceu interessado.',
        history: [],
        columnId: 'col-new',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
    {
        id: uuidv4(),
        name: 'Maria Souza',
        company: 'FinBank',
        role: 'CFO',
        priority: 'Média',
        tags: ['CFO', 'Ponte'],
        nextAction: 'Enviar email',
        nextActionDate: new Date().toISOString(),
        linkedInUrl: 'https://linkedin.com/in/mariasouza',
        phones: [],
        whatsapps: [],
        links: [],
        notes: 'Pediu para falar depois.',
        history: [],
        columnId: 'col-approach',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
    {
        id: uuidv4(),
        name: 'Carlos Mendes',
        company: 'AgroTech',
        role: 'Sócio',
        priority: 'Alta',
        tags: ['Sócio', 'Decisor'],
        nextAction: 'Agendar call',
        nextActionDate: new Date().toISOString(),
        linkedInUrl: 'https://linkedin.com/in/carlosmendes',
        phones: [],
        whatsapps: ['+5541988888888'],
        links: [],
        notes: '',
        history: [],
        columnId: 'col-replied',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
    {
        id: uuidv4(),
        name: 'Ana Costa',
        company: 'EduSmart',
        role: 'Gerente de TI',
        priority: 'Baixa',
        tags: ['TI'],
        nextAction: 'Follow-up',
        nextActionDate: new Date().toISOString(),
        linkedInUrl: 'https://linkedin.com/in/anacosta',
        phones: [],
        whatsapps: [],
        links: [],
        notes: 'Orçamento baixo no momento.',
        history: [],
        columnId: 'col-paused',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
    {
        id: uuidv4(),
        name: 'Roberto Lima',
        company: 'LogisFast',
        role: 'Diretor de Operações',
        priority: 'Alta',
        tags: ['Decisor'],
        nextAction: 'Apresentação',
        nextActionDate: new Date().toISOString(),
        linkedInUrl: 'https://linkedin.com/in/robertolima',
        phones: ['+5521977777777'],
        whatsapps: ['+5521977777777'],
        links: [],
        notes: 'Gostou da proposta V1.',
        history: [],
        columnId: 'col-closed',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    }
];

interface AppState {
    leads: Lead[];
    columns: Column[];
    templates: Template[];
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    seedData: () => void;
    addLead: (lead: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>) => void;
    updateLead: (id: string, updates: Partial<Lead>) => void;
    deleteLead: (id: string) => void;
    moveLead: (leadId: string, toColumnId: string) => void;
    addTemplate: (template: Omit<Template, 'id'>) => void;
    updateTemplate: (id: string, updates: Partial<Template>) => void;
    deleteTemplate: (id: string) => void;
    importData: (data: { leads: Lead[]; templates: Template[]; columns?: Column[] }) => void;
}

export const useAppStore = create<AppState>()(
    persist(
        (set, get) => ({
            leads: [],
            columns: defaultColumns,
            templates: [],
            searchQuery: '',

            setSearchQuery: (query) => set({ searchQuery: query }),

            seedData: () => set({ leads: mockLeads, templates: mockTemplates, columns: defaultColumns }),

            addLead: (leadData) => {
                const newLead: Lead = {
                    ...leadData,
                    id: uuidv4(),
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                };
                set((state) => ({ leads: [...state.leads, newLead] }));
            },

            updateLead: (id, updates) => {
                set((state) => ({
                    leads: state.leads.map((l) =>
                        l.id === id ? { ...l, ...updates, updatedAt: new Date().toISOString() } : l
                    ),
                }));
            },

            deleteLead: (id) => {
                set((state) => ({ leads: state.leads.filter((l) => l.id !== id) }));
            },

            moveLead: (leadId, toColumnId) => {
                set((state) => ({
                    leads: state.leads.map((l) =>
                        l.id === leadId ? { ...l, columnId: toColumnId, updatedAt: new Date().toISOString() } : l
                    ),
                }));
            },

            addTemplate: (tempData) => {
                const newTemplate: Template = {
                    ...tempData,
                    id: uuidv4(),
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

            importData: (data) => {
                set((state) => {
                    // Merge leads strictly by linkedInUrl (avoiding duplicates based on LinkedIn)
                    const existingLinks = new Set(state.leads.filter(l => l.linkedInUrl).map(l => l.linkedInUrl));
                    const newLeads = data.leads.filter(l => !l.linkedInUrl || !existingLinks.has(l.linkedInUrl));

                    return {
                        leads: [...state.leads, ...newLeads],
                        templates: data.templates?.length ? data.templates : state.templates,
                        columns: data.columns?.length ? data.columns : state.columns,
                    };
                });
            },
        }),
        {
            name: 'linkedin-kanban-storage',
            storage: createJSONStorage(() => storage),
        }
    )
);
