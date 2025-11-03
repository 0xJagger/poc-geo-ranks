// Internal types for UI (convenience)
export interface ItemEntity {
  id: string
  name: string
  emoji: string // For UI display purposes
}

export interface TierListEntity {
  id: string
  name: string
  rank_type: 'weighted_rank'
}

export interface Relation {
  id: string
  from: string // TierList entity ID
  to: string // Item entity ID
  score: number // Score annotation indicating tier (S=6, A=5, B=4, C=3, D=2, F=1)
}

// Internal Knowledge Graph Structure (for UI)
export interface KnowledgeGraph {
  entities: Array<ItemEntity | TierListEntity>
  relations: Relation[]
}

// Tier metadata for UI display (not entities)
export interface TierMeta {
  label: string
  score: number
  color: string
}

// Generic Property Graph Types (for export)
export interface PropertyGraphEntity {
  id: string
  properties: Record<string, any>
}

export interface PropertyGraphRelation {
  id: string
  from: string
  to: string
  properties: Record<string, any>
}

export interface PropertyGraph {
  entities: PropertyGraphEntity[]
  relations: PropertyGraphRelation[]
}

