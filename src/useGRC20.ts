import { useState, useCallback } from 'react'
import { Graph, IdUtils } from '@graphprotocol/grc-20'
import type { Id } from '@graphprotocol/grc-20'
import type { PropertyGraph } from './types'

// GRC-20 data types
type DataType = 'STRING' | 'NUMBER' | 'BOOLEAN' | 'TIME' | 'POINT' | 'RELATION'

// GRC-20 Edit structure (collection of operations)
export interface GRC20Edit {
  name: string
  ops: any[]
}

export interface PreparedGRC20Data {
  edit: GRC20Edit
  summary: {
    totalOps: number
    entityOps: number
    propertyOps: number
    relationOps: number
  }
}

export function useGRC20() {
  const [isPreparing, setIsPreparing] = useState(false)
  const [preparedData, setPreparedData] = useState<PreparedGRC20Data | null>(null)
  const [prepareStatus, setprepareStatus] = useState<{
    status: 'idle' | 'success' | 'error'
    message?: string
  }>({ status: 'idle' })

  // Helper to determine GRC-20 data type
  const getDataType = (value: any): DataType => {
    if (typeof value === 'number') return 'NUMBER'
    if (typeof value === 'boolean') return 'BOOLEAN'
    if (typeof value === 'string') {
      // Check if it's an ISO date
      if (/^\d{4}-\d{2}-\d{2}T/.test(value)) return 'TIME'
      return 'STRING'
    }
    return 'STRING'
  }

  // Convert property graph to GRC-20 edits
  const prepareGRC20Edits = useCallback(
    async (graph: PropertyGraph, metadata?: { title?: string; description?: string }) => {
      setIsPreparing(true)
      setprepareStatus({ status: 'idle' })

      try {
        const allOps: any[] = []
        const createdProperties = new Map<string, Id>()
        const entityIdMap = new Map<string, Id>() // Map our IDs to GRC-20 IDs

        let entityOpCount = 0
        let propertyOpCount = 0
        let relationOpCount = 0

        // Tier metadata for description labels
        const tierMetadata = [
          { label: 'S', score: 6 },
          { label: 'A', score: 5 },
          { label: 'B', score: 4 },
          { label: 'C', score: 3 },
          { label: 'D', score: 2 },
          { label: 'F', score: 1 },
        ]

        // Helper to get or create a property
        const getOrCreateProperty = (name: string, dataType: DataType): Id => {
          const key = `${name}:${dataType}`
          if (!createdProperties.has(key)) {
            const result = Graph.createProperty({ 
              name, 
              dataType,
            })
            createdProperties.set(key, result.id)
            // Add ops with description
            result.ops.forEach(op => {
              allOps.push({
                ...op,
                _description: `Create property "${name}" with type ${dataType}`,
              })
            })
            propertyOpCount += result.ops.length
          }
          return createdProperties.get(key)!
        }

        // Assume common properties already exist in the graph
        const namePropertyId = IdUtils.generate()
        const rankTypePropertyId = IdUtils.generate()
        const ranksPropertyId = IdUtils.generate()
        const scorePropertyId = IdUtils.generate()
        console.log(`ℹ️  Assuming properties already exist in the graph:`)
        console.log(`   - "name" (STRING): ${namePropertyId}`)
        console.log(`   - "rank_type" (STRING): ${rankTypePropertyId}`)
        console.log(`   - "ranks" (RELATION): ${ranksPropertyId}`)
        console.log(`   - "score" (NUMBER): ${scorePropertyId}`)
        
        // Store assumed properties in the map
        createdProperties.set('name:STRING', namePropertyId)
        createdProperties.set('rank_type:STRING', rankTypePropertyId)

        // Process entities - assume items already exist, only create TierList
        console.log('🔄 Processing entities...')
        
        // First, generate GRC-20 IDs for existing item entities (they already exist in the graph)
        const itemEntities = graph.entities.filter(e => !('rank_type' in e.properties && e.properties.rank_type === 'weighted_rank'))
        console.log(`ℹ️  Assuming ${itemEntities.length} item entities already exist in the graph:`)
        for (const itemEntity of itemEntities) {
          // Generate a GRC-20 ID for this item (simulating existing IDs in the graph)
          const itemGrc20Id = IdUtils.generate()
          entityIdMap.set(itemEntity.id, itemGrc20Id)
          console.log(`   - "${itemEntity.properties.name}": ${itemGrc20Id}`)
        }
        
        // Create only the TierList entity
        const tierListEntity = graph.entities.find(e => 'rank_type' in e.properties && e.properties.rank_type === 'weighted_rank')
        if (tierListEntity) {
          // Generate a GRC-20 ID for the tier list
          const tierListGrc20Id = IdUtils.generate()
          entityIdMap.set(tierListEntity.id, tierListGrc20Id)

          // Prepare values for the tier list entity
          const values: Array<{ property: Id; value: string }> = []
          
          for (const [attrName, attrValue] of Object.entries(tierListEntity.properties)) {
            const dataType = getDataType(attrValue)
            const propertyId = getOrCreateProperty(attrName, dataType)
            
            values.push({
              property: propertyId,
              value: String(attrValue),
            })
          }

          // Create tier list entity
          const entityResult = Graph.createEntity({
            id: tierListGrc20Id,
            values,
          })
          
          // Add ops with description
          entityResult.ops.forEach(op => {
            allOps.push({
              ...op,
              _description: `Create TierList entity "${tierListEntity.properties.name}"`,
            })
          })
          entityOpCount += entityResult.ops.length
          
          console.log(`✅ Created TierList entity: ${tierListEntity.properties.name}`)
        }

        // Process relations
        console.log('🔄 Creating relations to existing item entities...')
        for (const relation of graph.relations) {
          // Generate a GRC-20 ID for this relation
          const grc20RelationId = IdUtils.generate()
          
          // Get the mapped GRC-20 IDs for from/to entities
          const fromGrc20Id = entityIdMap.get(relation.from)
          const toGrc20Id = entityIdMap.get(relation.to)

          if (!fromGrc20Id || !toGrc20Id) {
            console.warn(`Skipping relation ${relation.id}: entity not found in mapping`)
            continue
          }

          // Create relation with score as entityValue
          const entityValues = relation.properties.score !== undefined 
            ? [{ 
                property: scorePropertyId, 
                value: String(relation.properties.score) 
              }]
            : undefined

          const relationResult = Graph.createRelation({
            id: grc20RelationId, // Use GRC-20 generated ID
            fromEntity: fromGrc20Id, // Use mapped GRC-20 ID
            toEntity: toGrc20Id, // Use mapped GRC-20 ID
            type: ranksPropertyId,
            entityValues,
          })
          
          // Add ops with description
          const itemEntity = graph.entities.find(e => e.id === relation.to)
          const itemName = itemEntity?.properties.name || 'Unknown'
          const score = relation.properties.score
          const tierLabel = tierMetadata.find(t => t.score === score)?.label || score
          
          relationResult.ops.forEach(op => {
            allOps.push({
              ...op,
              _description: `Rank "${itemName}" as tier ${tierLabel} (score: ${score})`,
            })
          })
          relationOpCount += relationResult.ops.length
        }

        // Create the edit
        const edit: GRC20Edit = {
          name: metadata?.title || 'Tier List Rank',
          ops: allOps,
        }

        const result: PreparedGRC20Data = {
          edit,
          summary: {
            totalOps: allOps.length,
            entityOps: entityOpCount,
            propertyOps: propertyOpCount,
            relationOps: relationOpCount,
          },
        }

        setPreparedData(result)
        setprepareStatus({
          status: 'success',
          message: `Successfully prepared ${allOps.length} GRC-20 operations`,
        })

        console.log('✅ GRC-20 Edit prepared:', edit)
        console.log('📊 Summary:', result.summary)

        return result
      } catch (error: any) {
        console.error('Failed to prepare GRC-20 edits:', error)
        setprepareStatus({
          status: 'error',
          message: error.message || 'Failed to prepare GRC-20 edits',
        })
        throw error
      } finally {
        setIsPreparing(false)
      }
    },
    []
  )

  const resetPreparedData = useCallback(() => {
    setPreparedData(null)
    setprepareStatus({ status: 'idle' })
  }, [])

  return {
    isPreparing,
    preparedData,
    prepareStatus,
    prepareGRC20Edits,
    resetPreparedData,
  }
}

