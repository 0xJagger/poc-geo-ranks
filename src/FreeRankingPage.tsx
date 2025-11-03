import { useState } from 'react'
import './FreeRankingPage.css'
import { GraphVisualization } from './GraphVisualization'
import { useGRC20 } from './useGRC20'
import type { 
  ItemEntity, 
  RankListEntity, 
  KnowledgeGraph, 
  PropertyGraph,
  PropertyGraphEntity,
  PropertyGraphRelation
} from './types'

interface FreeRankingPageProps {
  rankListEntity: RankListEntity
  initialItems: ItemEntity[]
  onBack: () => void
}

export function FreeRankingPage({ rankListEntity, initialItems, onBack }: FreeRankingPageProps) {
  // Track scores for each item (only ranked items have scores)
  const [itemScores, setItemScores] = useState<Map<string, number>>(new Map())
  
  // Track which items are ranked (in the ranking area)
  const [rankedItemIds, setRankedItemIds] = useState<Set<string>>(new Set())
  
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

  // Build knowledge graph from current scores
  const buildGraph = (): KnowledgeGraph => {
    const relations = []
    
    for (const itemId of rankedItemIds) {
      const score = itemScores.get(itemId)
      if (score !== undefined && score >= 0) {
        relations.push({
          id: crypto.randomUUID(),
          from: rankListEntity.id,
          to: itemId,
          score: score,
        })
      }
    }

    return {
      entities: [rankListEntity, ...initialItems],
      relations,
    }
  }

  const handleDragStart = (item: ItemEntity) => {
    setDraggedItem(item)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDropToRanked = () => {
    if (!draggedItem) return

    // Add to ranked area if not already there
    if (!rankedItemIds.has(draggedItem.id)) {
      setRankedItemIds(new Set([...rankedItemIds, draggedItem.id]))
      // Set default score of 0 when first dropped
      if (!itemScores.has(draggedItem.id)) {
        setItemScores(new Map(itemScores.set(draggedItem.id, 0)))
      }
    }
    
    setDraggedItem(null)
  }

  const handleDropToUnranked = () => {
    if (!draggedItem) return

    // Remove from ranked area
    const newRankedIds = new Set(rankedItemIds)
    newRankedIds.delete(draggedItem.id)
    setRankedItemIds(newRankedIds)
    
    // Remove score
    const newScores = new Map(itemScores)
    newScores.delete(draggedItem.id)
    setItemScores(newScores)
    
    setDraggedItem(null)
  }

  const handleScoreChange = (itemId: string, value: string) => {
    if (value === '') {
      // Allow blank/empty value while user is typing
      const newScores = new Map(itemScores)
      newScores.delete(itemId)
      setItemScores(newScores)
    } else {
      const numValue = parseFloat(value)
      if (!isNaN(numValue) && numValue >= 0) {
        setItemScores(new Map(itemScores.set(itemId, numValue)))
      }
    }
  }

  const handleReset = () => {
    setItemScores(new Map())
    setRankedItemIds(new Set())
  }

  const getRankedCount = () => {
    return rankedItemIds.size
  }

  const getRankedItems = (): ItemEntity[] => {
    return initialItems.filter(item => rankedItemIds.has(item.id))
  }

  const getUnrankedItems = (): ItemEntity[] => {
    return initialItems.filter(item => !rankedItemIds.has(item.id))
  }

  const convertToPropertyGraph = (): PropertyGraph => {
    const graph = buildGraph()
    
    const propertyEntities: PropertyGraphEntity[] = graph.entities.map(entity => {
      if ('rank_type' in entity && entity.rank_type === 'weighted_rank') {
        return {
          id: entity.id,
          properties: {
            name: entity.name,
            rank_type: entity.rank_type,
          },
        }
      } else if ('emoji' in entity) {
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
    setShowGraphViz(true)
  }

  const downloadGraphJSON = () => {
    const propertyGraph = convertToPropertyGraph()
    const dataStr = JSON.stringify(propertyGraph, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'free-ranking-graph.json'
    link.click()
    URL.revokeObjectURL(url)
  }

  const handlePrepareClick = () => {
    if (getRankedCount() === 0) {
      alert('Please assign scores to some items before preparing!')
      return
    }
    setShowPublishModal(true)
    handlePrepare()
  }

  const handlePrepare = async () => {
    try {
      const propertyGraph = convertToPropertyGraph()
      await prepareGRC20Edits(propertyGraph, {
        title: rankListEntity?.name,
        description: `Free scoring list with ${getRankedCount()} ranked items`,
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

  const graph = buildGraph()
  const rankedCount = getRankedCount()
  const rankedItems = getRankedItems()
  const unrankedItems = getUnrankedItems()

  // Sort ranked items by score (descending), treat undefined as 0
  const sortedRankedItems = [...rankedItems].sort((a, b) => {
    const scoreA = itemScores.get(a.id)
    const scoreB = itemScores.get(b.id)
    const numA = scoreA !== undefined ? scoreA : 0
    const numB = scoreB !== undefined ? scoreB : 0
    return numB - numA
  })

  return (
    <div className="app free-ranking-page">
      <div className="header">
        <div className="header-left">
          <button className="back-button" onClick={onBack}>
            ← Back
          </button>
          <h1>🔢 {rankListEntity.name}</h1>
          <span className="mode-badge">Free Scoring</span>
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
          <strong>Total Items:</strong> {initialItems.length}
        </div>
        <div className="graph-stat">
          <strong>Items Ranked:</strong> {rankedCount}
        </div>
        <div className="graph-stat">
          <strong>Relations:</strong> {graph.relations.length}
        </div>
      </div>

      <div className="free-ranking-content">
        <div className="ranking-instructions">
          <h2>Drag & Drop with Custom Scores</h2>
          <p>Drag items to the ranking area, then assign custom scores (0 or higher). Higher scores = better ranking.</p>
        </div>

        <div className="ranked-area-section">
          <h3>📊 Ranked Items</h3>
          <div
            className={`ranked-area ${draggedItem ? 'drag-active' : ''}`}
            onDragOver={handleDragOver}
            onDrop={handleDropToRanked}
          >
            {sortedRankedItems.length === 0 && (
              <div className="empty-message">Drag items here to rank them</div>
            )}
            {sortedRankedItems.map(item => {
              const score = itemScores.get(item.id)
              const displayValue = score !== undefined ? score : ''
              
              return (
                <div
                  key={item.id}
                  className="ranked-item"
                  draggable
                  onDragStart={() => handleDragStart(item)}
                >
                  <div className="item-info">
                    <span className="item-emoji">{item.emoji}</span>
                    <span className="item-name">{item.name}</span>
                  </div>
                  <div className="score-input-wrapper">
                    <label htmlFor={`score-${item.id}`}>Score:</label>
                    <input
                      id={`score-${item.id}`}
                      type="number"
                      min="0"
                      step="0.01"
                      value={displayValue}
                      placeholder="0"
                      onChange={(e) => handleScoreChange(item.id, e.target.value)}
                      className="score-input"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="unranked-section">
          <h3>Unranked Items</h3>
          <div
            className={`unranked-pool ${draggedItem ? 'drag-active' : ''}`}
            onDragOver={handleDragOver}
            onDrop={handleDropToUnranked}
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
                rankListEntity={rankListEntity}
                tierMetadata={[]} // No preset tiers in free mode
              />
              
              {graph.relations.length === 0 && (
                <div className="no-relations-overlay">
                  No items scored yet. Assign scores to create relations!
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
                <div className="stat-value">{rankedCount} / {initialItems.length}</div>
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
                  <p>Converting your ranking graph to GRC-20 operations</p>
                </div>
              ) : preparedData ? (
                <div className="publish-content">
                  <div className="prepare-success">
                    <div className="success-icon">✅</div>
                    <h3>GRC-20 Edits Ready!</h3>
                    <p>Your ranking has been successfully encoded as GRC-20 operations</p>
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

