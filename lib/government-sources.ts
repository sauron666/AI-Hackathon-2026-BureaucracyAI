/**
 * Web scraping utility for official government sources
 * Fallback when no data exists in the knowledge base
 * Uses direct HTTP requests to scrape official government websites
 */

// Government website templates by country and procedure type
interface GovernmentSource {
  name: string
  baseUrl: string
  searchUrl?: string
  description: string
}

// Known government portals
const GOVERNMENT_SOURCES: Record<string, GovernmentSource[]> = {
  BG: [
    {
      name: "Национален осигурителен институт (НОИ)",
      baseUrl: "https://www.nssi.bg",
      description: "National Social Security Institute - social security, pensions, benefits",
    },
    {
      name: "Агенция по заетостта",
      baseUrl: "https://www.az.government.bg",
      description: "Employment Agency - work permits, employment",
    },
    {
      name: "Министерство на вътрешните работи",
      baseUrl: "https://www.mvr.bg",
      description: "Ministry of Interior - residence permits, visas, documents",
    },
    {
      name: "Главна дирекция ГРАО",
      baseUrl: "https://www.grao.government.bg",
      description: "Civil Registration and Administrative Services",
    },
    {
      name: "НАП",
      baseUrl: "https://www.nap.bg",
      description: "National Revenue Agency - taxes, company registration",
    },
  ],
  DE: [
    {
      name: "Bundesamt für Migration und Flüchtlinge",
      baseUrl: "https://www.bamf.de",
      description: "Federal Office for Migration and Refugees",
    },
    {
      name: "Auswärtiges Amt",
      baseUrl: "https://www.auswaertiges-amt.de",
      description: "Foreign Office - visas, travel",
    },
    {
      name: "Bürgerservice",
      baseUrl: "https://www.service.bund.de",
      description: "Citizen Services Portal",
    },
  ],
  UK: [
    {
      name: "GOV.UK",
      baseUrl: "https://www.gov.uk",
      description: "Official UK Government Services",
    },
    {
      name: "UK Visas & Immigration",
      baseUrl: "https://www.gov.uk/government/organisations/uk-visas-and-immigration",
      description: "Visa and immigration services",
    },
  ],
  US: [
    {
      name: "USCIS",
      baseUrl: "https://www.uscis.gov",
      description: "U.S. Citizenship and Immigration Services",
    },
    {
      name: "USA.gov",
      baseUrl: "https://www.usa.gov",
      description: "Official Government Portal",
    },
  ],
}

// Keywords to identify government sources by procedure type
const PROCEDURE_KEYWORDS: Record<string, string[]> = {
  residence_permit: ["residence", "permit", "виза", "пребиваване", "ausländerbehörde"],
  work_permit: ["work", "permit", "работна", "виза", "arbeit", "beschäftigung"],
  business: ["business", "company", "registration", "фирма", "регистрация", "unternehmen"],
  tax: ["tax", "taxes", "данък", "steuer", "revenue", "nap"],
  pension: ["pension", "social security", "пенсия", "осигуровка", "rente"],
  citizenship: ["citizenship", "nationality", "гражданство", "staatsangehörigkeit"],
  documents: ["passport", "ID", "документи", "ausweis", "document"],
}

/**
 * Find relevant government sources for a given procedure
 */
export function findRelevantSources(
  country: string,
  procedureType?: string
): GovernmentSource[] {
  const sources = GOVERNMENT_SOURCES[country] || []
  
  if (!procedureType) return sources
  
  // Filter by keywords
  const keywords = PROCEDURE_KEYWORDS[procedureType] || []
  if (keywords.length === 0) return sources
  
  return sources.filter(source => {
    const text = `${source.name} ${source.description}`.toLowerCase()
    return keywords.some(keyword => text.includes(keyword.toLowerCase()))
  })
}

/**
 * Detect if query mentions a specific government office or agency
 */
export function extractGovernmentOffice(query: string): string | null {
  const lowerQuery = query.toLowerCase()
  
  // Common government office patterns
  const patterns = [
    // Bulgarian
    /\b(НОИ|НАП|МВР|НАИС|НОИ)\b/i,
    // German
    /\b(Ausländerbehörde|Finanzamt|Standesamt|Rathaus|Bürgeramt)\b/i,
    // English
    /\b(immigration office|tax office|registry|consulate|embassy)\b/i,
  ]
  
  for (const pattern of patterns) {
    const match = lowerQuery.match(pattern)
    if (match) return match[1]
  }
  
  return null
}

/**
 * Extract text content from HTML
 */
function extractTextFromHTML(html: string): string {
  // Remove script and style elements
  let text = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
  text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
  
  // Remove HTML tags
  text = text.replace(/<[^>]+>/g, ' ')
  
  // Decode HTML entities
  text = text.replace(/&nbsp;/g, ' ')
  text = text.replace(/&amp;/g, '&')
  text = text.replace(/&lt;/g, '<')
  text = text.replace(/&gt;/g, '>')
  text = text.replace(/&quot;/g, '"')
  text = text.replace(/&#39;/g, "'")
  
  // Clean up whitespace
  text = text.replace(/\s+/g, ' ')
  text = text.replace(/\n\s*\n/g, '\n\n')
  
  return text.trim()
}

/**
 * Search for official government information
 */
export async function scrapeGovernmentInfo(
  country: string,
  procedure: string,
  options: {
    searchFallback?: boolean
    maxSources?: number
  } = {}
): Promise<{
  sources: GovernmentSource[]
  scrapedContent: string
  success: boolean
}> {
  const { maxSources = 3 } = options
  
  // Find relevant government sources
  let sources = findRelevantSources(country, procedure)
  
  // If no sources found, try to add common sources
  if (sources.length === 0) {
    const defaultSources = GOVERNMENT_SOURCES[country]
    if (defaultSources) {
      sources = defaultSources.slice(0, maxSources)
    }
  } else {
    sources = sources.slice(0, maxSources)
  }
  
  let scrapedContent = ""
  let success = false
  
  // Try scraping from each source
  for (const source of sources) {
    try {
      // Try the base URL and common search patterns
      const urlsToTry = [
        source.baseUrl,
        `${source.baseUrl}/search?q=${encodeURIComponent(procedure)}`,
        `${source.baseUrl}/?s=${encodeURIComponent(procedure)}`,
      ]
      
      for (const url of urlsToTry) {
        try {
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), 10000) // 10s timeout
          
          const response = await fetch(url, {
            signal: controller.signal,
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; FormWise/1.0)',
              'Accept': 'text/html,application/xhtml+xml',
            },
          })
          
          clearTimeout(timeoutId)
          
          if (response.ok) {
            const html = await response.text()
            const textContent = extractTextFromHTML(html)
            
            // Only use if we got meaningful content
            if (textContent.length > 200) {
              // Extract relevant portion (first 2000 chars of relevant content)
              const relevantContent = textContent.slice(0, 2000)
              
              scrapedContent += `\n\n--- Source: ${source.name} (${source.baseUrl}) ---\n${relevantContent}\n`
              success = true
              break // Got content, move to next source
            }
          }
        } catch {
          // Try next URL
        }
      }
    } catch (err) {
      console.warn(`Failed to scrape ${source.name}:`, err)
    }
  }
  
  return {
    sources,
    scrapedContent,
    success,
  }
}

/**
 * Generate a search URL for government information
 */
export function generateGovernmentSearchUrl(country: string, query: string): string {
  const searchEngines: Record<string, string> = {
    BG: "https://www.google.com/search?q=site:bg+%22",
    DE: "https://www.google.com/search?q=site:gov.de+%22",
    UK: "https://www.google.com/search?q=site:gov.uk+%22",
    US: "https://www.google.com/search?q=site:gov+%22",
  }
  
  const engine = searchEngines[country] || "https://www.google.com/search?q="
  return `${engine}${encodeURIComponent(query)}`
}

/**
 * Format scraped government content for API response
 */
export function formatGovernmentFallback(
  procedure: string,
  scrapedContent: string,
  sources: GovernmentSource[]
): string {
  const formattedSources = sources
    .map(s => `- ${s.name}: ${s.baseUrl}`)
    .join("\n")
  
  return `
Based on official government sources, here is information about: ${procedure}

${scrapedContent}

Official Sources:
${formattedSources}

Please note: This information was retrieved from official government websites. For the most accurate and up-to-date information, always refer to the official sources listed above.
`.trim()
}
