import { useMemo } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  ConnectionLineType,
  MarkerType,
  Handle,
  Position,
  type Node,
  type Edge,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import type { ItemEntity, RankListEntity, KnowledgeGraph } from './types'

interface GraphVisualizationProps {
  graph: KnowledgeGraph
  rankListEntity: RankListEntity
  tierMetadata: Array<{ label: string; score: number; color: string }>
}

// Custom RankList Node Component
const RankListNode = ({ data }: { data: any }) => {
  return (
    <div
      style={{
        background: '#667eea',
        border: '3px solid rgba(255, 255, 255, 0.3)',
        borderRadius: '16px',
        padding: '24px 32px',
        minWidth: '250px',
        boxShadow: '0 8px 32px rgba(102, 126, 234, 0.4)',
      }}
    >
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
      <div
        style={{
          fontSize: '0.75rem',
          textTransform: 'uppercase',
          letterSpacing: '1px',
          color: 'rgba(255, 255, 255, 0.7)',
          marginBottom: '8px',
          fontWeight: 600,
        }}
      >
        RankList Entity
      </div>
      <div
        style={{
          fontSize: '1.5rem',
          fontWeight: 900,
          color: 'white',
          marginBottom: '8px',
        }}
      >
        {data.label}
      </div>
      <div
        style={{
          fontSize: '0.7rem',
          color: 'rgba(255, 255, 255, 0.5)',
          fontFamily: 'Courier New, monospace',
          marginBottom: '8px',
        }}
      >
        {data.id}
      </div>
      <div
        style={{
          fontSize: '0.85rem',
          color: 'rgba(255, 255, 255, 0.8)',
          fontWeight: 600,
        }}
      >
        type: weighted_rank
      </div>
    </div>
  )
}

// Custom Item Node Component
const ItemNode = ({ data }: { data: any }) => {
  return (
    <div
      style={{
        background: 'rgba(255, 255, 255, 0.1)',
        border: `2px solid ${data.color || 'rgba(255, 255, 255, 0.2)'}`,
        borderRadius: '12px',
        padding: '16px 20px',
        minWidth: '120px',
        backdropFilter: 'blur(10px)',
        transition: 'all 0.3s ease',
      }}
    >
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <div
        style={{
          fontSize: '2rem',
          textAlign: 'center',
          marginBottom: '8px',
        }}
      >
        {data.emoji}
      </div>
      <div
        style={{
          fontSize: '1rem',
          fontWeight: 700,
          color: 'white',
          textAlign: 'center',
          marginBottom: '4px',
        }}
      >
        {data.label}
      </div>
      <div
        style={{
          fontSize: '0.65rem',
          color: 'rgba(255, 255, 255, 0.4)',
          fontFamily: 'Courier New, monospace',
          textAlign: 'center',
        }}
      >
        {data.id.substring(0, 8)}...
      </div>
      {data.tierLabel && (
        <div
          style={{
            marginTop: '8px',
            padding: '4px 8px',
            background: data.color,
            borderRadius: '6px',
            fontSize: '0.75rem',
            fontWeight: 700,
            color: '#000',
            textAlign: 'center',
          }}
        >
          {data.tierLabel} tier (score: {data.score})
        </div>
      )}
    </div>
  )
}

const nodeTypes = {
  rankList: RankListNode,
  item: ItemNode,
}

export function GraphVisualization({ graph, rankListEntity, tierMetadata }: GraphVisualizationProps) {
  // Convert graph data to React Flow format
  const { nodes, edges } = useMemo(() => {
    const flowNodes: Node[] = []
    const flowEdges: Edge[] = []

    // Add RankList node (center)
    const centerX = 500
    const centerY = 300
    
    flowNodes.push({
      id: rankListEntity.id,
      type: 'rankList',
      position: { x: centerX - 125, y: centerY - 75 }, // Center the node (approx 250px wide)
      data: {
        label: rankListEntity.name,
        id: rankListEntity.id,
      },
    })

    // Get item entities that have relations (are ranked)
    const rankedItemIds = new Set(graph.relations.map(r => r.to))
    const rankedItems = graph.entities.filter(
      (e): e is ItemEntity => 'emoji' in e && rankedItemIds.has(e.id)
    )

    // Calculate circular layout for ranked items around the RankList
    const radius = 350

    rankedItems.forEach((item, index) => {
      // Find relation for this item
      const relation = graph.relations.find(r => r.to === item.id)!
      const tierInfo = tierMetadata.find(t => t.score === relation.score)

      // Calculate position in circular layout
      const angle = (index / rankedItems.length) * 2 * Math.PI - Math.PI / 2
      const x = centerX + radius * Math.cos(angle)
      const y = centerY + radius * Math.sin(angle)

      flowNodes.push({
        id: item.id,
        type: 'item',
        position: { x, y },
        data: {
          label: item.name,
          emoji: item.emoji,
          id: item.id,
          score: relation.score,
          tierLabel: tierInfo?.label,
          color: tierInfo?.color || 'rgba(255, 255, 255, 0.2)',
        },
      })

      // Add edge
      flowEdges.push({
        id: relation.id,
        source: rankListEntity.id,
        target: item.id,
        type: ConnectionLineType.Bezier,
        animated: true,
        style: {
          stroke: tierInfo?.color || '#667eea',
          strokeWidth: 3,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: tierInfo?.color || '#667eea',
        },
        label: `${tierInfo?.label || '?'} (${relation.score})`,
        labelStyle: {
          fill: 'white',
          fontWeight: 700,
          fontSize: 12,
        },
        labelBgStyle: {
          fill: tierInfo?.color || '#667eea',
          fillOpacity: 0.9,
        },
        labelBgPadding: [8, 4] as [number, number],
        labelBgBorderRadius: 4,
      })
    })

    return { nodes: flowNodes, edges: flowEdges }
  }, [graph, rankListEntity, tierMetadata])

  return (
    <div style={{ width: '100%', height: '600px' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        attributionPosition="bottom-left"
        minZoom={0.2}
        maxZoom={2}
        defaultEdgeOptions={{
          type: ConnectionLineType.Bezier,
          animated: true,
        }}
      >
        <Background color="#667eea" gap={16} />
        <Controls />
        <MiniMap
          nodeColor={(node) => {
            if (node.type === 'rankList') return '#667eea'
            return '#764ba2'
          }}
          maskColor="rgba(0, 0, 0, 0.6)"
        />
      </ReactFlow>
    </div>
  )
}

