'use client'

import { useState } from 'react'
import { Sidebar } from "@/components/layout/Sidebar"
import { Header } from "@/components/layout/Header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Search, Building2, Users, Zap, Plus } from 'lucide-react'

interface FoundPerson {
  name: string
  title?: string
  linkedin_url?: string
  company_name: string
  company_url: string
}

export default function CompanySearchPage() {
  const [companyUrl, setCompanyUrl] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [maxResults, setMaxResults] = useState(10)
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<FoundPerson[]>([])
  const [selectedPeople, setSelectedPeople] = useState<string[]>([])
  const [status, setStatus] = useState<string>('')

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
          role_filter: roleFilter,
          max_results: maxResults,
        }),
      })
      const data = await res.json()
      setResults(data.people || [])
      setStatus(`${data.people?.length || 0} pessoas encontradas`)
    } catch (e) {
      setStatus('Erro ao buscar. Tente novamente.')
    }
    setLoading(false)
  }

  const toggleSelect = (url: string) => {
    setSelectedPeople(prev => prev.includes(url) ? prev.filter(i => i !== url) : [...prev, url])
  }

  const toggleSelectAll = () => {
    if (selectedPeople.length === results.length) setSelectedPeople([])
    else setSelectedPeople(results.map(p => p.linkedin_url || p.name))
  }

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
      const ids = savedContacts.map((c: any) => c.id).filter(Boolean)
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
        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <Building2 className="w-8 h-8 text-primary" />
              Busca por Empresa
            </h1>
            <p className="text-muted-foreground mt-1">Cole o link do LinkedIn de uma empresa para encontrar decisores.</p>
          </div>

          {/* Search Form */}
          <div className="rounded-xl border border-border/50 bg-card/30 backdrop-blur-md p-6 space-y-4">
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Cole o link da empresa: linkedin.com/company/empresa-nome"
                  className="pl-10 h-12 text-sm"
                  value={companyUrl}
                  onChange={e => setCompanyUrl(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Filtro de cargo (ex: Diretor, CEO, Compras)"
                  className="pl-10 h-11 text-sm"
                  value={roleFilter}
                  onChange={e => setRoleFilter(e.target.value)}
                />
              </div>
              <select
                className="h-11 px-4 rounded-md border border-border/50 bg-background/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                value={maxResults}
                onChange={e => setMaxResults(Number(e.target.value))}
              >
                {[5, 10, 20, 50].map(n => (
                  <option key={n} value={n}>{n} pessoas</option>
                ))}
              </select>
              <Button onClick={handleSearch} disabled={loading} className="h-11 px-8 gap-2">
                <Users className="w-4 h-4" />
                {loading ? 'Buscando...' : 'Buscar Decisores'}
              </Button>
            </div>
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
                    <Button variant="outline" size="sm" className="gap-2" onClick={() => handleAddToDashboard(false)}>
                      <Plus className="w-4 h-4" />
                      Adicionar {selectedPeople.length} ao Dashboard
                    </Button>
                    <Button size="sm" className="gap-2 bg-primary" onClick={() => handleAddToDashboard(true)}>
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
                    <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-border/30 hover:bg-muted/20 transition-colors">
                      <Checkbox
                        checked={selectedPeople.includes(key)}
                        onCheckedChange={() => toggleSelect(key)}
                      />
                      <div className="flex-1">
                        <p className="font-semibold text-foreground">{person.name}</p>
                        {person.title && (
                          <p className="text-xs text-muted-foreground italic">{person.title}</p>
                        )}
                      </div>
                      {person.linkedin_url && (
                        <a href={person.linkedin_url} target="_blank" rel="noreferrer">
                          <Badge variant="outline" className="text-blue-400 border-blue-400/40 hover:bg-blue-500/10">
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
