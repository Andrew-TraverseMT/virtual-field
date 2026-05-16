import rawData from '@/data/assignments.json'

export type Deliverable = {
  id: string
  label: string
  description: string
  conditional?: boolean
  condition?: string
}

export type RubricCriterion = {
  id: string
  label: string
  points: number
  description: string
}

export type LocationOption = {
  id: string
  label: string
  description: string
  requiresStereonet: boolean
  hazardTheme: string
}

export type Milestone = {
  id: string
  label: string
  week: number
}

export type ProposalSection = {
  id: string
  label: string
  description: string
}

export type Download = {
  platform: 'windows' | 'mac'
  label: string
  url: string
}

export type Assignment = {
  id: string
  sequence: number
  unit: string
  type: 'virtual-landscape' | 'visible-geology' | 'cyoa'
  title: string
  subtitle: string
  description: string
  url: string | null
  embedUrl: string | null
  canEmbed: boolean
  urlOffline?: boolean
  downloads?: Download[]
  materials: string[]
  gradingMaterials?: string[]
  attribution?: string
  learningGoals?: string[]
  deliverables?: Deliverable[]
  rubric: {
    totalPoints: number
    criteria: RubricCriterion[]
  }
  estimatedHours: number
  week: number
  locationOptions?: LocationOption[] | null
  milestones?: Milestone[]
  proposalSections?: ProposalSection[]
}

export const assignments: Assignment[] = rawData.assignments as Assignment[]

export function getAssignment(id: string): Assignment | undefined {
  return assignments.find((a) => a.id === id)
}
