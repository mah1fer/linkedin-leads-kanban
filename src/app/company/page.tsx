'use client'

import { useState } from 'react'
import { Sidebar } from "@/components/layout/Sidebar"
import { Header } from "@/components/layout/Header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Search, Building2, Users, Zap, Plus, X, ChevronDown } from 'lucide-react'

interface FoundPerson {
  name: string
  title?: string
  linkedin_url?: string
  company_name: string
  company_url: string
}

// Presets de decisores agrupados por área
const DECISION_MAKER_PRESETS = [
  {
    group: 'C-Level',
    color: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
    roles: ['CEO', 'CFO', 'CTO', 'CMO', 'COO', 'CHRO', 'CPO', 'CRO'],
  },
  {
    group: 'Diretoria',
    color: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    roles: ['Diretor', 'Diretora', 'VP', 'Vice-Presidente'],
  },
  {
    group: 'Gestão',
    color: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
    roles: ['Gerente', 'Head', 'Coordenador', 'Supervisor'],
  },
  {
    group: 'Áreas Compradoras',
    color: 'bg-green-500/15 text-green-400 border-green-500/30',
    roles: ['Compras', 'Procurement', 'Supply Chain', 'Suprimentos', 'Logística'],
  },
  {
    group: 'Tecnologia',
    color: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
    roles: ['TI', 'Infraestrutura', 'Segurança', 'DevOps', 'Engenharia'],
  },
  {
    group: 'Comercial',
    color: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
    roles: ['Vendas', 'Comercial', 'Business Development', 'Account'],
  },
]

function RoleChip({
  role,
  selected,
  color,
  onToggle,
}: {
  role: string
  selected: boolean
  color: string
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`
        text-xs px-2.5 py-1 rounded-full border font-medium transition-all
        ${selected ? color + ' ring-1 ring-inset ring-current' : 'bg-muted/30 text-muted-foreground border-border/40 hover:border-border'}
      `}
    >
      {selected && <span className="mr-1">✓</span>}
      {role}
    </button>
  )
}

export default function CompanySearchPage() {
  const [companyUrl, setCompanyUrl] = useState('')
  const [selectedRoles, setSelectedRoles] = useState<string[]>([])
  const [customRole, setCustomRole] = useState('')
  const [maxResults, setMaxResults] = useState(10)
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<FoundPerson[]>([])
  const [selectedPeople, setSelectedPeople] = useState<string[]>([])
  const [status, setStatus] = useState<string>('')
  const [showAdvanced, setShowAdvanced] = useState(false)

  const toggleRole = (role: string) => {
    setSelectedRoles(prev =>
      prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
    )
  }

  const removeRole = (role: string) => setSelectedRoles(prev => prev.filter(r => r !== role))

  const addCustomRole = () => {
    const r = customRole.trim()
    if (r && !selectedRoles.includes(r)) {
      setSelectedRoles(prev => [...prev, r])
      setCustomRole('')
    }
  }

  // Monta o filtro final combinando cargos selecionados
  const buildRoleFilter = (): string => {
    const all = [...selectedRoles]
    if (customRole.trim()) all.push(customRole.trim())
    return all.join(' OR ')
  }

  async function handleSearch() {
    if (!companyUrl) return
    setLoading(true)
    setResults([])
    setSelectedPeople([])
    setStatus('Buscando decisores...')

    try {
      const res = await fetch('/api/company/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_url: companyUrl,
          company_name: companyUrl.includes('linkedin.com')
            ? companyUrl.split('/').filter(Boolean).pop()
            : companyUrl,
          role_filter: buildRoleFilter(),
          max_results: maxResults,
        }),
      })
      const data = await res.json()
      setResults(data.people || [])
      setStatus(`${data.people?.length || 0} pessoas encontradas`)
    } catch {
      setStatus('Erro ao buscar. Tente novamente.')
    }
    setLoading(false)
  }

  const toggleSelect = (key: string) =>
    setSelectedPeople(prev => prev.includes(key) ? prev.filter(i => i !== key) : [...prev, key])

  const toggleSelectAll = () =>
    setSelectedPeople(selectedPeople.length === results.length ? [] : results.map(p => p.linkedin_url || p.name))

  async function handleAddToDashboard(enrich = false) {
    const selected = results.filter(p => selectedPeople.includes(p.linkedin_url || p.name))
    if (!selected.length) return

    setStatus('Salvando no dashboard...')
    const res = await fetch('/api/contacts/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(selected.map(p => ({
        name: p.name,
        title: p.title,
        company: p.company_name,
        company_url: p.company_url,
        linkedin_url: p.linkedin_url,
      }))),
    })
    const savedContacts = await res.json()

    if (enrich && savedContacts.length > 0) {
      setStatus('Enriquecendo contatos...')
      const ids = savedContacts.map((c: { id?: string }) => c.id).filter(Boolean)
      await fetch('/api/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contact_ids: ids }),
      })
    }

    setStatus(`${selected.length} pessoa(s) salva(s) no dashboard!`)
  }

  return (
    <main className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col pl-64 w-full h-full relative">
        <Header />
        <div className="flex-1 overflow-y-auto p-8 space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <Building2 className="w-8 h-8 text-primary" />
              Busca por Empresa
            </h1>
            <p className="text-muted-foreground mt-1">
              Encontre decisores em qualquer empresa do LinkedIn por cargo e quantidade.
            </p>
          </div>

          {/* Search Form */}
          <div className="rounded-xl border border-border/50 bg-card/30 backdrop-blur-md p-6 space-y-5">

            {/* URL da empresa */}
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Cole o link da empresa: linkedin.com/company/empresa-nome"
                className="pl-10 h-12 text-sm"
                value={companyUrl}
                onChange={e => setCompanyUrl(e.target.value)}
              />
            </div>

            {/* Presets de decisores */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Nível decisor
              </p>
              <div className="space-y-2.5">
                {DECISION_MAKER_PRESETS.map(group => (
                  <div key={group.group} className="flex items-start gap-2 flex-wrap">
                    <span className="text-xs text-muted-foreground/60 w-24 pt-1 shrink-0">
                      {group.group}
                    </span>
                    <div className="flex gap-1.5 flex-wrap">
                      {group.roles.map(role => (
                        <RoleChip
                          key={role}
                          role={role}
                          selected={selectedRoles.includes(role)}
                          color={group.color}
                          onToggle={() => toggleRole(role)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Cargos selecionados + custom */}
            <div className="flex items-center gap-2 flex-wrap">
              {selectedRoles.map(role => (
                <span
                  key={role}
                  className="flex items-center gap-1 text-xs bg-primary/15 text-primary border border-primary/30 rounded-full px-2.5 py-1"
                >
                  {role}
                  <button onClick={() => removeRole(role)} className="hover:text-destructive ml-0.5">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}

              {/* Campo de cargo personalizado */}
              <div className="flex items-center gap-1.5">
                <Input
                  placeholder="+ cargo personalizado"
                  className="h-8 text-xs w-44 rounded-full"
                  value={customRole}
                  onChange={e => setCustomRole(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addCustomRole()}
                />
                {customRole.trim() && (
                  <Button size="sm" variant="ghost" className="h-8 px-2" onClick={addCustomRole}>
                    <Plus className="w-3 h-3" />
                  </Button>
                )}
              </div>
            </div>

            {/* Quantidade + botão buscar */}
            <div className="flex items-center gap-3 pt-1">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Quantidade:</span>
                <div className="flex gap-1">
                  {[5, 10, 20, 50].map(n => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setMaxResults(n)}
                      className={`
                        text-xs px-3 py-1.5 rounded-md border font-medium transition-all
                        ${maxResults === n
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-muted/30 text-muted-foreground border-border/40 hover:border-border'}
                      `}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              <Button
                onClick={handleSearch}
                disabled={loading || !companyUrl}
                className="ml-auto h-11 px-8 gap-2"
              >
                <Users className="w-4 h-4" />
                {loading ? 'Buscando...' : `Buscar${selectedRoles.length > 0 ? ` (${selectedRoles.length} cargo${selectedRoles.length > 1 ? 's' : ''})` : ''}`}
              </Button>
            </div>

            {/* Dica quando nenhum cargo selecionado */}
            {selectedRoles.length === 0 && !loading && (
              <p className="text-xs text-muted-foreground/60 italic">
                Sem filtro de cargo: busca todos os perfis da empresa.
              </p>
            )}
          </div>

          {/* Results */}
          {(results.length > 0 || status) && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">{status}</span>
                  {results.length > 0 && (
                    <Button variant="ghost" size="sm" onClick={toggleSelectAll}>
                      {selectedPeople.length === results.length ? 'Deselecionar Todos' : 'Selecionar Todos'}
                    </Button>
                  )}
                </div>
                {selectedPeople.length > 0 && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={() => handleAddToDashboard(false)}
                    >
                      <Plus className="w-4 h-4" />
                      Adicionar {selectedPeople.length} ao Dashboard
                    </Button>
                    <Button
                      size="sm"
                      className="gap-2 bg-primary"
                      onClick={() => handleAddToDashboard(true)}
                    >
                      <Zap className="w-4 h-4" />
                      Adicionar e Enriquecer
                    </Button>
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-border/50 bg-card/30 backdrop-blur-md overflow-hidden">
                {results.map((person, i) => {
                  const key = person.linkedin_url || person.name
                  return (
                    <div
                      key={i}
                      className="flex items-center gap-4 px-5 py-4 border-b border-border/30 hover:bg-muted/20 transition-colors last:border-0"
                    >
                      <Checkbox
                        checked={selectedPeople.includes(key)}
                        onCheckedChange={() => toggleSelect(key)}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground truncate">{person.name}</p>
                        {person.title && (
                          <p className="text-xs text-muted-foreground italic truncate">{person.title}</p>
                        )}
                      </div>
                      {person.linkedin_url && (
                        <a href={person.linkedin_url} target="_blank" rel="noreferrer">
                          <Badge
                            variant="outline"
                            className="text-blue-400 border-blue-400/40 hover:bg-blue-500/10 shrink-0"
                          >
                            LinkedIn →
                          </Badge>
                        </a>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
