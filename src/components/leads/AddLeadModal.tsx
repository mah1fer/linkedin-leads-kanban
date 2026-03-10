'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAppStore, defaultColumns } from '@/store/useAppStore';

interface AddLeadModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddLeadModal({ isOpen, onOpenChange }: AddLeadModalProps) {
  const addLead = useAppStore((state) => state.addLead);
  const columns = useAppStore((state) => state.columns);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    name: '',
    role: '',
    company: '',
    linkedInUrl: '',
    email: '',
    phone: '',
    columnId: 'novo',
    priority: 'Média' as 'Alta' | 'Média' | 'Baixa',
    notes: '',
  });

  const set = (key: string, value: string) => setForm(f => ({ ...f, [key]: value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setLoading(true);
    try {
      await addLead({
        name: form.name.trim(),
        role: form.role.trim(),
        company: form.company.trim(),
        linkedInUrl: form.linkedInUrl.trim(),
        email: form.email.trim(),
        phones: form.phone.trim() ? [form.phone.trim()] : [],
        whatsapps: [],
        columnId: form.columnId,
        priority: form.priority,
        notes: form.notes.trim(),
        tags: [],
        nextAction: '',
        nextActionDate: '',
        links: [],
        history: [],
      });
      setForm({ name: '', role: '', company: '', linkedInUrl: '', email: '', phone: '', columnId: 'novo', priority: 'Média', notes: '' });
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Adicionar Lead Manualmente</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="name">Nome *</Label>
              <Input id="name" placeholder="João Silva" value={form.name} onChange={e => set('name', e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="role">Cargo</Label>
              <Input id="role" placeholder="CEO" value={form.role} onChange={e => set('role', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="company">Empresa</Label>
              <Input id="company" placeholder="Acme Corp" value={form.company} onChange={e => set('company', e.target.value)} />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="linkedin">LinkedIn URL</Label>
              <Input id="linkedin" placeholder="https://linkedin.com/in/joao-silva" value={form.linkedInUrl} onChange={e => set('linkedInUrl', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="joao@acme.com" value={form.email} onChange={e => set('email', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Telefone</Label>
              <Input id="phone" placeholder="+55 11 99999-9999" value={form.phone} onChange={e => set('phone', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="stage">Estágio</Label>
              <select
                id="stage"
                value={form.columnId}
                onChange={e => set('columnId', e.target.value)}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {columns.map(col => (
                  <option key={col.id} value={col.id}>{col.title}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="priority">Prioridade</Label>
              <select
                id="priority"
                value={form.priority}
                onChange={e => set('priority', e.target.value)}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="Alta">Alta</option>
                <option value="Média">Média</option>
                <option value="Baixa">Baixa</option>
              </select>
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="notes">Notas</Label>
              <Input id="notes" placeholder="Contexto ou observações..." value={form.notes} onChange={e => set('notes', e.target.value)} />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={loading || !form.name.trim()}>
              {loading ? 'Salvando...' : 'Salvar Lead'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
