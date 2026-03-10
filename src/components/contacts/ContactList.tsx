'use client'

import { useState, useEffect } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Search, Filter, Mail, Phone, Zap, UserPlus, Download, LayoutGrid, LayoutList } from 'lucide-react'
import { Input } from "@/components/ui/input"
import { Board } from '@/components/kanban/Board'
import { ConfidenceBadge } from '@/components/enrich/ConfidenceBadge'
import { EnrichButton } from '@/components/enrich/EnrichButton'
import { EnrichProgress } from '@/components/enrich/EnrichProgress'
import { AddLeadModal } from '@/components/leads/AddLeadModal'
import { useAppStore } from '@/store/useAppStore'

export function ContactList() {
  const leads = useAppStore((state) => state.leads);
  const loading = useAppStore((state) => state.loading);
  const fetchLeads = useAppStore((state) => state.fetchLeads);
  const searchQuery = useAppStore((state) => state.searchQuery);
  const setSearchQuery = useAppStore((state) => state.setSearchQuery);
  const columns = useAppStore((state) => state.columns);

  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [filterStage, setFilterStage] = useState('')
  const [view, setView] = useState<'list' | 'kanban'>('list')
  const [enriching, setEnriching] = useState(false)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)

  useEffect(() => {
    fetchLeads()
  }, [fetchLeads])

  const contacts = leads.filter(l => {
    if (filterStage && l.columnId !== filterStage) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return l.name.toLowerCase().includes(q) ||
           l.company.toLowerCase().includes(q) ||
           l.role.toLowerCase().includes(q);
  });

  const toggleSelectAll = () => {
    if (selectedIds.length === contacts.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(contacts.map(c => c.id))
    }
  }

  const toggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  const handleExport = (format: 'csv' | 'json') => {
    const params = new URLSearchParams({ format })
    if (selectedIds.length > 0) params.set('ids', selectedIds.join(','))
    if (filterStage) params.set('stage', filterStage)
    window.open(`/api/export?${params.toString()}`, '_blank')
  }

  const handleEnrich = async () => {
    if (!selectedIds.length) return
    setEnriching(true)
    await fetch('/api/enrich', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contact_ids: selectedIds }),
    })
    setEnriching(false)
    fetchLeads()
  }

  return (
    <div className="flex flex-col h-full bg-background/50 backdrop-blur-sm p-8 space-y-6 overflow-y-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Sua Base de Leads</h1>
          <p className="text-muted-foreground mt-1">Gerencie e enriqueça seus contatos profissionais.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center border border-border/50 rounded-md overflow-hidden">
            <Button variant={view === 'list' ? 'secondary' : 'ghost'} size="sm" className="rounded-none gap-1.5" onClick={() => setView('list')}>
              <LayoutList className="w-4 h-4" /> Lista
            </Button>
            <Button variant={view === 'kanban' ? 'secondary' : 'ghost'} size="sm" className="rounded-none gap-1.5" onClick={() => setView('kanban')}>
              <LayoutGrid className="w-4 h-4" /> Kanban
            </Button>
          </div>
          <Button variant="outline" className="gap-2" onClick={() => setIsAddModalOpen(true)}>
            <UserPlus className="w-4 h-4" />
            Adicionar Manual
          </Button>
          <Button variant="outline" className="gap-2" onClick={() => handleExport('csv')}>
            <Download className="w-4 h-4" />
            Exportar
          </Button>
          <Button className="bg-primary hover:bg-primary/90 gap-2" onClick={handleEnrich} disabled={enriching || !selectedIds.length}>
            <Zap className="w-4 h-4" />
            {enriching ? 'Enriquecendo...' : `Enriquecer (${selectedIds.length})`}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-3 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, empresa ou cargo..."
            className="pl-10 h-11 bg-background/50 border-border/50 focus:ring-primary"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <select
            className="w-full h-11 pl-10 pr-4 rounded-md border border-border/50 bg-background/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary appearance-none"
            value={filterStage}
            onChange={(e) => setFilterStage(e.target.value)}
          >
            <option value="">Todos os Estágios</option>
            {columns.map(col => (
              <option key={col.id} value={col.id}>{col.title}</option>
            ))}
          </select>
        </div>
      </div>

      {view === 'kanban' ? (
        <div className="flex-1 overflow-hidden">
          <Board />
        </div>
      ) : (
      <div className="rounded-xl border border-border/50 bg-card/30 backdrop-blur-md overflow-hidden shadow-2xl shadow-primary/5">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow>
              <TableHead className="w-12 text-center">
                <Checkbox
                  checked={selectedIds.length === contacts.length && contacts.length > 0}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead>Lead</TableHead>
              <TableHead>Empresa / Cargo</TableHead>
              <TableHead>Contatos</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Score</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-64 text-center text-muted-foreground animate-pulse">
                  Carregando sua base...
                </TableCell>
              </TableRow>
            ) : contacts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-64 text-center text-muted-foreground">
                  Nenhum lead encontrado. Comece a prospectar!
                </TableCell>
              </TableRow>
            ) : (
              contacts.map((contact) => (
                <TableRow key={contact.id} className="hover:bg-muted/20 transition-colors group">
                  <TableCell className="text-center">
                    <Checkbox
                      checked={selectedIds.includes(contact.id)}
                      onCheckedChange={() => toggleSelect(contact.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-semibold text-foreground group-hover:text-primary transition-colors">
                        {contact.name || 'Sem nome'}
                      </span>
                      {contact.linkedInUrl && (
                        <a href={contact.linkedInUrl} target="_blank" className="text-xs text-muted-foreground hover:text-blue-400">
                          LinkedIn Profile
                        </a>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                         <span className="text-sm font-medium">{contact.company || 'N/A'}</span>
                         <EnrichButton
                            contactId={contact.id}
                            currentStatus={contact.enrichmentStatus}
                            onSuccess={fetchLeads}
                         />
                      </div>
                      <span className="text-xs text-muted-foreground italic">{contact.role || 'Sem cargo'}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-4 items-center">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5 text-xs">
                          <Mail className="w-3.5 h-3.5 text-blue-400" />
                          <span className={contact.email ? 'text-foreground font-medium' : 'text-muted-foreground italic'}>
                            {contact.email || 'Não encontrado'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs">
                          <Phone className="w-3.5 h-3.5 text-green-400" />
                          <span className={contact.whatsapps?.[0] || contact.phones?.[0] ? 'text-foreground font-medium' : 'text-muted-foreground italic'}>
                            {contact.whatsapps?.[0] || contact.phones?.[0] || 'Não encontrado'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <Badge variant="outline" className="capitalize text-[10px] px-2 py-0.5 w-fit">
                        {contact.enrichmentStatus || 'pending'}
                      </Badge>
                      <EnrichProgress status={contact.enrichmentStatus as any} />
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <ConfidenceBadge
                      label={
                        !contact.enrichmentScore ? 'ESPECULATIVO'
                        : contact.enrichmentScore >= 0.80 ? 'ALTO'
                        : contact.enrichmentScore >= 0.60 ? 'MÉDIO'
                        : contact.enrichmentScore >= 0.40 ? 'BAIXO'
                        : 'ESPECULATIVO'
                      }
                      score={contact.enrichmentScore}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      )}

      <AddLeadModal isOpen={isAddModalOpen} onOpenChange={setIsAddModalOpen} />
    </div>
  )
}
