-- Database Schema for LinkedIn Leads Kanban

-- Table: contacts
CREATE TABLE contacts (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    title text,
    company text,
    company_url text,
    linkedin_url text UNIQUE,
    email text,
    email_confidence int DEFAULT 0,
    phone text,
    phone_confidence int DEFAULT 0,
    whatsapp text,
    whatsapp_source text,
    tags text[] DEFAULT '{}',
    stage text DEFAULT 'novo',
    overall_confidence int DEFAULT 0,
    enrichment_status text DEFAULT 'pending',
    enrichment_score int DEFAULT 0,
    raw_sources jsonb DEFAULT '{}',
    created_at timestamptz DEFAULT now(),
    enriched_at timestamptz,
    updated_at timestamptz DEFAULT now()
);

-- Table: enrichment_logs
CREATE TABLE enrichment_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    contact_id uuid REFERENCES contacts(id) ON DELETE CASCADE,
    source text NOT NULL,
    found_data jsonb,
    confidence int,
    created_at timestamptz DEFAULT now()
);

-- Table: email_candidates
CREATE TABLE email_candidates (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    contact_id uuid REFERENCES contacts(id) ON DELETE CASCADE,
    email text NOT NULL,
    confidence int DEFAULT 0,
    verified boolean DEFAULT false,
    catch_all boolean DEFAULT false,
    sources text[] DEFAULT '{}',
    is_primary boolean DEFAULT false,
    created_at timestamptz DEFAULT now()
);

-- Table: phone_candidates
CREATE TABLE phone_candidates (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    contact_id uuid REFERENCES contacts(id) ON DELETE CASCADE,
    phone text NOT NULL,
    confidence int DEFAULT 0,
    has_whatsapp boolean DEFAULT false,
    type text DEFAULT 'unknown',
    sources text[] DEFAULT '{}',
    is_primary boolean DEFAULT false,
    created_at timestamptz DEFAULT now()
);

-- Table: company_searches
CREATE TABLE company_searches (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    company_name text,
    company_url text,
    filters jsonb,
    results_count int DEFAULT 0,
    status text DEFAULT 'pending',
    created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security (RLS) - for now, we'll keep it simple
-- and allow all operations, but in a production app you'd restrict this.
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrichment_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE phone_candidates ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all operations (TEMP)
CREATE POLICY "Allow all operations for authenticated users" ON contacts FOR ALL USING (true);
CREATE POLICY "Allow all operations for authenticated users" ON enrichment_logs FOR ALL USING (true);
CREATE POLICY "Allow all operations for authenticated users" ON company_searches FOR ALL USING (true);
CREATE POLICY "Allow all operations for authenticated users" ON email_candidates FOR ALL USING (true);
CREATE POLICY "Allow all operations for authenticated users" ON phone_candidates FOR ALL USING (true);
