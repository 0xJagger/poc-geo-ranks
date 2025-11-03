import './ModeSelection.css'

export type RankingMode = 'tier' | 'free' | 'slider'

interface ModeSelectionProps {
  categoryName: string
  onSelectMode: (mode: RankingMode) => void
  onBack: () => void
}

export function ModeSelection({ categoryName, onSelectMode, onBack }: ModeSelectionProps) {
  return (
    <div className="mode-selection">
      <div className="mode-header">
        <button className="back-button" onClick={onBack}>
          ← Back
        </button>
        <h1>🎯 {categoryName}</h1>
      </div>

      <div className="mode-content">
        <h2>Choose Your Ranking Style</h2>
        <p className="mode-subtitle">
          Select how you want to rank your items
        </p>

        <div className="mode-cards">
          <div
            className="mode-card"
            onClick={() => onSelectMode('tier')}
          >
            <div className="mode-icon">🎯</div>
            <h3 className="mode-name">Tier Mode</h3>
            <p className="mode-description">
              Drag items into preset tiers (S, A, B, C, D, F) with fixed scores
            </p>
            <div className="mode-features">
              <div className="feature">✓ Quick and simple</div>
              <div className="feature">✓ Standard tier format</div>
              <div className="feature">✓ Fixed score system (6-1)</div>
            </div>
          </div>

          <div
            className="mode-card"
            onClick={() => onSelectMode('free')}
          >
            <div className="mode-icon">🔢</div>
            <h3 className="mode-name">Free Scoring</h3>
            <p className="mode-description">
              Assign custom scores to each item with full control
            </p>
            <div className="mode-features">
              <div className="feature">✓ Custom scores</div>
              <div className="feature">✓ Any number (0 or higher)</div>
              <div className="feature">✓ Fine-grained control</div>
            </div>
          </div>

          <div
            className="mode-card"
            onClick={() => onSelectMode('slider')}
          >
            <div className="mode-icon">🎚️</div>
            <h3 className="mode-name">Slider Mode</h3>
            <p className="mode-description">
              Use interactive sliders to rate items from 1 to 10
            </p>
            <div className="mode-features">
              <div className="feature">✓ Visual sliders</div>
              <div className="feature">✓ 1-10 scale</div>
              <div className="feature">✓ Color-coded scores</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

