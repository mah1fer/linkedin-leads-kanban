export type Priority = 'Alta' | 'Média' | 'Baixa';
export type ColumnId = string;

export interface LinkItem {
  id: string;
  label: string;
  url: string;
}

export interface Interaction {
  id: string;
  date: string;
  note: string;
}

export interface Lead {
  id: string;
  name: string;
  company: string;
  role: string;
  priority: Priority;
  tags: string[];
  nextAction: string;
  nextActionDate: string;
  linkedInUrl: string;
  phones: string[];
  whatsapps: string[];
  email?: string;
  links: LinkItem[];
  notes: string;
  history: Interaction[];
  columnId: ColumnId;
  createdAt: string;
  updatedAt: string;
}

export interface Template {
  id: string;
  name: string;
  content: string; // E.g., "Olá {Nome}, vi que você é {Cargo} na {Empresa}..."
}

export interface Column {
  id: ColumnId;
  title: string;
}
