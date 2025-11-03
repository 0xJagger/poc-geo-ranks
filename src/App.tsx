import { useState } from 'react'
import './App.css'
import { HomePage } from './HomePage'
import { GraphVisualization } from './GraphVisualization'
import { getCategoryData } from './categoryData'
import { useGRC20 } from './useGRC20'
import type { 
  ItemEntity, 
  TierListEntity, 
  KnowledgeGraph, 
  TierMeta, 
  Relation,
  PropertyGraph,
  PropertyGraphEntity,
  PropertyGraphRelation
} from './types'

// Tier metadata for UI display (not entities, just display config)
const tierMetadata: TierMeta[] = [
  { label: 'S', score: 6, color: '#ff7f7f' },
  { label: 'A', score: 5, color: '#ffbf7f' },
  { label: 'B', score: 4, color: '#ffdf7f' },
  { label: 'C', score: 3, color: '#ffff7f' },
  { label: 'D', score: 2, color: '#bfff7f' },
  { label: 'F', score: 1, color: '#7fbfff' },
]

function App() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [tierListEntity, setTierListEntity] = useState<TierListEntity | null>(null)
  const [initialItems, setInitialItems] = useState<ItemEntity[]>([])
  
  // Initialize Knowledge Graph
  const [graph, setGraph] = useState<KnowledgeGraph>({
    entities: [],
    relations: [],
  })

  const [draggedItem, setDraggedItem] = useState<ItemEntity | null>(null)
  const [showGraphViz, setShowGraphViz] = useState(false)
  const [showPublishModal, setShowPublishModal] = useState(false)
  
  // GRC-20 integration
  const {
    isPreparing,
    preparedData,
    prepareStatus,
    prepareGRC20Edits,
    resetPreparedData,
  } = useGRC20()
  
  const handleCategorySelect = (categoryId: string) => {
    const categoryData = getCategoryData(categoryId)
    if (!categoryData) return
    
    // Create TierList entity for this category
    const newTierListEntity: TierListEntity = {
      id: crypto.randomUUID(),
      name: categoryData.name,
      rank_type: 'weighted_rank',
    }
    
    setTierListEntity(newTierListEntity)
    setInitialItems(categoryData.items)
    setSelectedCategory(categoryId)
    
    // Initialize graph with new data
    setGraph({
      entities: [newTierListEntity, ...categoryData.items],
      relations: [],
    })
  }
  
  const handleBackToHome = () => {
    setSelectedCategory(null)
    setTierListEntity(null)
    setInitialItems([])
    setGraph({
      entities: [],
      relations: [],
    })
  }
  
  // Show homepage if no category is selected
  if (!selectedCategory || !tierListEntity) {
    return <HomePage onSelectCategory={handleCategorySelect} />
  }

  // Helper: Get all item entities
  const getItemEntities = (): ItemEntity[] => {
    return graph.entities.filter(
      (e): e is ItemEntity => 'emoji' in e
    )
  }

  // Helper: Get items for a specific tier score
  const getItemsForTierScore = (score: number): ItemEntity[] => {
    const itemIdsAtScore = graph.relations
      .filter(rel => rel.from === tierListEntity.id && rel.score === score)
      .map(rel => rel.to)
    return getItemEntities().filter(item => itemIdsAtScore.includes(item.id))
  }

  // Helper: Get unranked items (items with no relations)
  const getUnrankedItems = (): ItemEntity[] => {
    const rankedItemIds = graph.relations.map(rel => rel.to)
    return getItemEntities().filter(item => !rankedItemIds.includes(item.id))
  }

  // Helper: Generate unique relation ID
  const generateRelationId = () => {
    return crypto.randomUUID()
  }

  const handleDragStart = (item: ItemEntity) => {
    setDraggedItem(item)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (targetScore: number | null) => {
    if (!draggedItem) return

    setGraph(prevGraph => {
      let newRelations = [...prevGraph.relations]

      // Remove existing relation for this item (if any)
      newRelations = newRelations.filter(rel => rel.to !== draggedItem.id)

      // If dropping into a tier (not unranked), create new relation
      if (targetScore !== null) {
        const newRelation: Relation = {
          id: generateRelationId(),
          from: tierListEntity.id,
          to: draggedItem.id,
          score: targetScore,
        }
        newRelations.push(newRelation)
      }

      return {
        ...prevGraph,
        relations: newRelations,
      }
    })

    setDraggedItem(null)
  }

  const handleReset = () => {
    if (!tierListEntity) return
    setGraph({
      entities: [tierListEntity, ...initialItems],
      relations: [],
    })
  }

  // Convert internal graph to property graph format
  const convertToPropertyGraph = (): PropertyGraph => {
    const propertyEntities: PropertyGraphEntity[] = graph.entities.map(entity => {
      if ('rank_type' in entity && entity.rank_type === 'weighted_rank') {
        // TierList entity
        return {
          id: entity.id,
          properties: {
            name: entity.name,
            rank_type: entity.rank_type,
          },
        }
      } else if ('emoji' in entity) {
        // Item entity (exclude emoji from export)
        return {
          id: entity.id,
          properties: {
            name: entity.name,
          },
        }
      }
      return { id: entity.id, properties: {} }
    })

    const propertyRelations: PropertyGraphRelation[] = graph.relations.map(relation => ({
      id: relation.id,
      from: relation.from,
      to: relation.to,
      properties: {
        score: relation.score,
      },
    }))

    return {
      entities: propertyEntities,
      relations: propertyRelations,
    }
  }

  const exportGraph = () => {
    const propertyGraph = convertToPropertyGraph()
    
    console.log('📊 Property Graph:', propertyGraph)
    console.log('📊 JSON:', JSON.stringify(propertyGraph, null, 2))
    
    setShowGraphViz(true)
  }

  const downloadGraphJSON = () => {
    const propertyGraph = convertToPropertyGraph()
    
    const dataStr = JSON.stringify(propertyGraph, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'tierlist-graph.json'
    link.click()
    URL.revokeObjectURL(url)
  }

  const handlePrepareClick = () => {
    if (graph.relations.length === 0) {
      alert('Please rank some items before preparing!')
      return
    }
    setShowPublishModal(true)
    // Automatically prepare the edits when modal opens
    handlePrepare()
  }

  const handlePrepare = async () => {
    try {
      const propertyGraph = convertToPropertyGraph()
      await prepareGRC20Edits(propertyGraph, {
        title: tierListEntity?.name,
        description: `Tier list with ${graph.relations.length} ranked items`,
      })
    } catch (error: any) {
      console.error('Prepare error:', error)
      alert(error.message || 'Failed to prepare GRC-20 edits')
    }
  }

  const downloadGRC20Edits = () => {
    if (!preparedData) return

    const dataStr = JSON.stringify(preparedData.edit, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'grc20-edits.json'
    link.click()
    URL.revokeObjectURL(url)
  }

  const unrankedItems = getUnrankedItems()
  const itemCount = getItemEntities().length
  const tierListCount = graph.entities.filter((e): e is TierListEntity => 'rank_type' in e && e.rank_type === 'weighted_rank').length

  return (
    <div className="app">
      <div className="header">
        <div className="header-left">
          <button className="back-button" onClick={handleBackToHome}>
            ← Back
          </button>
          <h1>🎯 {tierListEntity.name}</h1>
        </div>
        <div className="header-actions">
          <button className="publish-button" onClick={handlePrepareClick}>
            ⚙️ Prepare GRC-20 Edits
          </button>
          <button className="export-button" onClick={exportGraph}>
            View Graph
          </button>
          <button className="reset-button" onClick={handleReset}>
            Reset All
          </button>
        </div>
      </div>

      <div className="graph-info">
        <div className="graph-stat">
          <strong>Entities:</strong> {itemCount} items, {tierListCount} tier list
        </div>
        <div className="graph-stat">
          <strong>Relations:</strong> {graph.relations.length}
        </div>
        <div className="graph-stat">
          <strong>Tier List:</strong> {tierListEntity.name}
        </div>
      </div>

      <div className="tier-list">
        {tierMetadata.map(tier => {
          const tieredItems = getItemsForTierScore(tier.score)
          return (
            <div key={tier.label} className="tier-row">
              <div className="tier-label" style={{ backgroundColor: tier.color }}>
                <div className="tier-name">{tier.label}</div>
                <div className="tier-score">({tier.score})</div>
              </div>
              <div
                className={`tier-content ${draggedItem ? 'drag-active' : ''}`}
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(tier.score)}
              >
                {tieredItems.length === 0 && (
                  <div className="empty-tier-message">Drop items here</div>
                )}
                {tieredItems.map(item => (
                  <div
                    key={item.id}
                    className="item"
                    draggable
                    onDragStart={() => handleDragStart(item)}
                  >
                    <span className="item-emoji">{item.emoji}</span>
                    <span className="item-label">{item.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      <div className="unranked-section">
        <h2>Unranked Items</h2>
        <div
          className={`unranked-pool ${draggedItem ? 'drag-active' : ''}`}
          onDragOver={handleDragOver}
          onDrop={() => handleDrop(null)}
        >
          {unrankedItems.length === 0 && (
            <div className="empty-message">All items ranked!</div>
          )}
          {unrankedItems.map(item => (
            <div
              key={item.id}
              className="item"
              draggable
              onDragStart={() => handleDragStart(item)}
            >
              <span className="item-emoji">{item.emoji}</span>
              <span className="item-label">{item.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Graph Visualization Modal */}
      {showGraphViz && (
        <div className="modal-overlay" onClick={() => setShowGraphViz(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>📊 Knowledge Graph Visualization</h2>
              <button className="close-button" onClick={() => setShowGraphViz(false)}>
                ✕
              </button>
            </div>
            
            <div className="graph-viz-container">
              <GraphVisualization 
                graph={graph} 
                tierListEntity={tierListEntity}
                tierMetadata={tierMetadata}
              />
              
              {graph.relations.length === 0 && (
                <div className="no-relations-overlay">
                  No items ranked yet. Drag items to tiers to create relations!
                </div>
              )}
            </div>

            <div className="graph-stats">
              <div className="stat-box">
                <div className="stat-label">Total Entities</div>
                <div className="stat-value">{graph.entities.length}</div>
              </div>
              <div className="stat-box">
                <div className="stat-label">Total Relations</div>
                <div className="stat-value">{graph.relations.length}</div>
              </div>
              <div className="stat-box">
                <div className="stat-label">Items Ranked</div>
                <div className="stat-value">{graph.relations.length} / {itemCount}</div>
              </div>
            </div>

            <div className="modal-actions">
              <button className="download-button" onClick={downloadGraphJSON}>
                📥 Download JSON
              </button>
              <button className="close-modal-button" onClick={() => setShowGraphViz(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GRC-20 Edits Modal */}
      {showPublishModal && (
        <div className="modal-overlay" onClick={() => { setShowPublishModal(false); resetPreparedData(); }}>
          <div className="modal-content publish-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>⚙️ GRC-20 Edits</h2>
              <button className="close-button" onClick={() => { setShowPublishModal(false); resetPreparedData(); }}>
                ✕
              </button>
            </div>

            <div className="publish-modal-body">
              {isPreparing ? (
                <div className="wallet-connection">
                  <div className="wallet-icon">⚙️</div>
                  <h3>Preparing GRC-20 Edits...</h3>
                  <p>Converting your tier list graph to GRC-20 operations</p>
                </div>
              ) : preparedData ? (
                <div className="publish-content">
                  <div className="prepare-success">
                    <div className="success-icon">✅</div>
                    <h3>GRC-20 Edits Ready!</h3>
                    <p>Your tier list has been successfully encoded as GRC-20 operations</p>
                  </div>

                  <div className="publish-summary">
                    <h3>Edit Summary</h3>
                    <div className="summary-item">
                      <strong>Edit Name:</strong> {preparedData.edit.name}
                    </div>
                    <div className="summary-item">
                      <strong>Total Operations:</strong> {preparedData.summary.totalOps}
                    </div>
                    <div className="summary-item">
                      <strong>Entity Operations:</strong> {preparedData.summary.entityOps}
                    </div>
                    <div className="summary-item">
                      <strong>Property Operations:</strong> {preparedData.summary.propertyOps}
                    </div>
                    <div className="summary-item">
                      <strong>Relation Operations:</strong> {preparedData.summary.relationOps}
                    </div>
                  </div>

                  <div className="ops-preview">
                    <h4>Operations Preview</h4>
                    <div className="ops-code">
                      <pre>{JSON.stringify(preparedData.edit, null, 2).slice(0, 500)}...</pre>
                    </div>
                  </div>

                  {prepareStatus.status !== 'idle' && (
                    <div className={`publish-status ${prepareStatus.status}`}>
                      {prepareStatus.status === 'success' && '✅'}
                      {prepareStatus.status === 'error' && '❌'}
                      {prepareStatus.message}
                    </div>
                  )}

                  <div className="publish-actions">
                    <button 
                      className="download-grc20-button" 
                      onClick={downloadGRC20Edits}
                    >
                      💾 Download GRC-20 Edits
                    </button>
                    <button 
                      className="done-button" 
                      onClick={() => { setShowPublishModal(false); resetPreparedData(); }}
                    >
                      Done
                    </button>
                  </div>
                </div>
              ) : (
                <div className="wallet-connection">
                  <div className="wallet-icon">❌</div>
                  <h3>Failed to Prepare Edits</h3>
                  <p>{prepareStatus.message || 'An error occurred'}</p>
                  <button 
                    className="connect-wallet-button" 
                    onClick={handlePrepare}
                  >
                    Try Again
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
