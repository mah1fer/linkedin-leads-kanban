import Anthropic from '@anthropic-ai/sdk'

export interface LlmValidatorInput {
  name: string
  company: string
  emails: Array<{ value: string; source_url: string; confidence: number }>
  phones: Array<{ value: string; source_url: string }>
  social_profiles: Array<{ platform: string; url: string }>
}

export interface LlmValidatorResult {
  best_email: string | null
  best_phone: string | null
  email_confidence: number
  phone_confidence: number
  warnings: string[]
  reasoning: string
}

export async function crossReferenceWithLLM(
  contactData: { name: string; company: string; domain?: string },
  allFoundData: LlmValidatorInput
): Promise<LlmValidatorResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return {
      best_email: null,
      best_phone: null,
      email_confidence: 0,
      phone_confidence: 0,
      warnings: ['ANTHROPIC_API_KEY not configured'],
      reasoning: 'LLM Validator skipped: API key not configured.',
    }
  }

  const client = new Anthropic({ apiKey })

  const prompt = `Você é um validador de dados de contato profissional. Recebeu dados de múltiplas fontes sobre uma pessoa. Analise e retorne um JSON válido.

Pessoa: ${contactData.name}
Empresa: ${contactData.company}
Domínio da empresa: ${contactData.domain || 'desconhecido'}

Emails encontrados:
${JSON.stringify(allFoundData.emails, null, 2)}

Telefones/WhatsApp encontrados:
${JSON.stringify(allFoundData.phones, null, 2)}

Retorne SOMENTE o JSON abaixo, sem explicações:
{
  "best_email": "email mais provável ou null",
  "best_phone": "telefone mais provável ou null",
  "email_confidence": 0-100,
  "phone_confidence": 0-100,
  "warnings": ["lista de inconsistências"],
  "reasoning": "explicação curta da sua análise"
}`

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 350,
      messages: [{ role: 'user', content: prompt }],
    })

    const content = message.content[0]
    if (content.type !== 'text') throw new Error('Unexpected response type')

    const jsonMatch = content.text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON found in response')

    return JSON.parse(jsonMatch[0]) as LlmValidatorResult
  } catch (e: any) {
    return {
      best_email: null,
      best_phone: null,
      email_confidence: 0,
      phone_confidence: 0,
      warnings: [`LLM error: ${e.message}`],
      reasoning: 'LLM validation failed.',
    }
  }
}
