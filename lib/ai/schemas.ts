import { z } from "zod"

// Enhanced step schema with more detail
export const stepSchema = z.object({
  number: z.number().describe("Step number in sequence"),
  title: z.string().describe("Brief, actionable title for this step"),
  description: z.string().describe("Detailed description of exactly what to do"),
  estimatedTime: z.string().optional().describe("Estimated time to complete this step (e.g., '1-2 days', '3-5 business days')"),
  tips: z.string().optional().describe("Practical tips to avoid common pitfalls"),
  officialSource: z.string().optional().describe("Official website or form URL for this step"),
  formReference: z.string().optional().describe("Specific form number and name if applicable"),
  potentialIssues: z.array(z.string()).optional().describe("Common issues that may arise and how to resolve them"),
})

// Enhanced document schema with legal basis
export const documentSchema = z.object({
  name: z.string().describe("Official name of the document/form"),
  description: z.string().describe("What this document is and its purpose"),
  required: z.boolean().describe("Whether this document is mandatory"),
  whereToGet: z.string().optional().describe("Where to obtain this document (office, website, authority)"),
  validityPeriod: z.string().optional().describe("How long this document is valid"),
  requirements: z.array(z.string()).optional().describe("Specific requirements (photo specs, copies, certifications)"),
  cost: z.string().optional().describe("Cost of obtaining this document"),
  translationRequired: z.boolean().optional().describe("Whether translation is required"),
  legalBasis: z.string().optional().describe("Law or regulation requiring this document"),
})

// Enhanced office info schema
export const officeInfoSchema = z.object({
  name: z.string().describe("Official name of the office or institution"),
  address: z.string().optional().describe("Complete physical address"),
  website: z.string().optional().describe("Official website URL"),
  phone: z.string().optional().describe("Contact phone number"),
  email: z.string().optional().describe("Contact email address"),
  hours: z.string().optional().describe("Working hours and days"),
  appointmentRequired: z.boolean().optional().describe("Whether appointment is required"),
  languages: z.array(z.string()).optional().describe("Languages in which service is available"),
  jurisdiction: z.string().optional().describe("Which area/region this office serves"),
})

// Legal foundation schema for citing sources
export const legalFoundationSchema = z.object({
  lawName: z.string().describe("Official name of the law or regulation"),
  article: z.string().optional().describe("Specific article or section number"),
  year: z.string().optional().describe("Year of the law or last amendment"),
  url: z.string().optional().describe("Official URL where this law can be found"),
  lastVerified: z.string().optional().describe("Date when this information was last verified"),
})

// Eligibility criteria schema
export const eligibilitySchema = z.object({
  eligibleGroups: z.array(z.string()).describe("Who is eligible (citizens, residents, specific nationalities, etc.)"),
  prerequisites: z.array(z.string()).optional().describe("Required conditions before applying"),
  exceptions: z.array(z.string()).optional().describe("Special cases or exceptions"),
  exclusions: z.array(z.string()).optional().describe("Who should NOT use this procedure"),
})

// Cost breakdown schema
export const costSchema = z.object({
  governmentFees: z.string().optional().describe("Official government fees with legal basis"),
  translationCosts: z.string().optional().describe("Cost of official translation if required"),
  notarizationCosts: z.string().optional().describe("Cost of notarization/authentication"),
  otherCosts: z.array(z.object({
    item: z.string(),
    cost: z.string(),
  })).optional().describe("Other associated costs"),
  paymentMethods: z.array(z.string()).optional().describe("Accepted payment methods"),
  totalEstimate: z.string().optional().describe("Total estimated cost"),
})

// Timeline schema for better time estimates
export const timelineSchema = z.object({
  minimumTime: z.string().optional().describe("Minimum processing time"),
  maximumTime: z.string().optional().describe("Maximum processing time if no issues"),
  factorsAffectingTimeline: z.array(z.string()).optional().describe("What can extend processing time"),
  expeditedOptions: z.boolean().optional().describe("Whether expedited processing is available"),
  expeditedTime: z.string().optional().describe("Expedited processing time if available"),
  expeditedCost: z.string().optional().describe("Additional cost for expedited processing"),
  afterApproval: z.string().optional().describe("What happens after approval"),
})

// Important warnings schema
export const warningSchema = z.object({
  commonRejections: z.array(z.object({
    reason: z.string(),
    howToAvoid: z.string(),
  })).optional().describe("Common reasons for rejection and prevention"),
  scams: z.array(z.string()).optional().describe("Known scams or unofficial intermediaries to avoid"),
  whatNotToDo: z.array(z.string()).optional().describe("Actions to avoid"),
})

// Related procedures schema
export const relatedProcedureSchema = z.object({
  name: z.string().describe("Name of related procedure"),
  description: z.string().optional().describe("Brief description of how it relates"),
  order: z.enum(["before", "after", "alternative"]).optional().describe("When to do this procedure"),
})

// Main enhanced bureaucracy response schema
export const bureaucracyResponseSchema = z.object({
  // Basic info
  procedureName: z.string().describe("Official name of the bureaucratic procedure"),
  difficulty: z.enum(["easy", "moderate", "complex"]).describe("Difficulty level of the procedure"),
  totalEstimatedTime: z.string().describe("Total estimated time to complete the entire process"),

  // Summary
  summary: z.string().describe("A clear, comprehensive summary (3-5 sentences)"),
  detailedSummary: z.string().optional().describe("Extended summary with key points"),

  // Legal foundation
  legalFoundation: legalFoundationSchema.describe("Legal basis for this procedure"),
  
  // Eligibility
  eligibility: eligibilitySchema.describe("Who can use this procedure"),

  // Steps
  steps: z.array(stepSchema).describe("Ordered list of steps to complete the procedure"),
  
  // Documents
  requiredDocuments: z.array(documentSchema).describe("List of all documents needed"),
  
  // Costs
  costs: costSchema.describe("Detailed cost breakdown"),
  
  // Timeline
  timeline: timelineSchema.describe("Processing timeline details"),
  
  // Office info
  officeInfo: officeInfoSchema.describe("Information about the relevant office"),
  
  // Warnings
  warnings: warningSchema.describe("Important warnings and pitfalls"),
  
  // Related procedures
  relatedProcedures: z.array(relatedProcedureSchema).optional().describe("Related procedures the user might need"),
  
  // Additional notes
  additionalNotes: z.string().optional().describe("Important notes, tips, or additional information"),

  // Trust and continuation signals
  confidenceScore: z.number().min(0).max(1).optional().describe("Model confidence from 0 to 1 based on source quality and completeness"),
  confidenceReasons: z.array(z.string()).optional().describe("Short reasons explaining the confidence score"),
  needsMoreContext: z.boolean().optional().describe("Whether the answer needs more user context before it can be reliable"),
  missingContext: z.array(z.string()).optional().describe("Specific facts or fields missing from the user's question"),
  followUpQuestions: z.array(z.string()).optional().describe("Clarifying questions the user can answer to improve the response"),
  
  // Scope clarification
  scope: z.object({
    covers: z.array(z.string()).describe("What this procedure covers"),
    doesNotCover: z.array(z.string()).optional().describe("What this procedure does NOT cover"),
  }).optional().describe("Scope of this procedure"),

  // Fallback for unstructured responses
  _rawContent: z.string().optional(),
  _sessionId: z.string().optional(),
})

export type BureaucracyResponse = z.infer<typeof bureaucracyResponseSchema>
export type Step = z.infer<typeof stepSchema>
export type Document = z.infer<typeof documentSchema>
export type OfficeInfo = z.infer<typeof officeInfoSchema>
export type LegalFoundation = z.infer<typeof legalFoundationSchema>
export type Eligibility = z.infer<typeof eligibilitySchema>
export type CostBreakdown = z.infer<typeof costSchema>
export type Timeline = z.infer<typeof timelineSchema>
export type Warning = z.infer<typeof warningSchema>
export type RelatedProcedure = z.infer<typeof relatedProcedureSchema>
