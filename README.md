# Geo Ranks - Knowledge Graph Tier List Maker

A modern tier list application that models rankings as a **property graph** and publishes them to a **decentralized knowledge graph** using the GRC-20 standard.

## Features

### Core Functionality
- **Drag & Drop Interface**: Intuitive tier list creation with HTML5 drag and drop
- **Multiple Categories**: Pre-configured item sets including:
  - 🍕 Food
  - 🎬 Movies
  - 🎙️ Podcasts
  - 🎮 Video Games
  - 🎵 Music Genres
  - ⚽ Sports

### Knowledge Graph Architecture
- **Property Graph Model**: Items and tier lists are modeled as graph entities with flexible properties
- **Weighted Rankings**: Each tier (S, A, B, C, D, F) has a numeric score (6-1)
- **Relations with Context**: Edges between tier lists and items carry score annotations
- **UUID-based Identity**: All entities have unique identifiers for graph consistency

### Visualization
- **Interactive Graph View**: React Flow-powered visualization of your tier list graph
- **Entity Nodes**: Visual representation of tier lists and ranked items
- **Scored Relations**: Edges show the tier score and label for each ranked item
- **Real-time Updates**: Graph updates as you drag items into tiers

### GRC-20 Edits Preparation
- **SDK Integration**: Uses `@graphprotocol/grc-20` SDK to prepare valid GRC-20 operations
- **Minimal Edits**: Assumes existing properties and items, only creates new TierList entity and relations
- **Operation Descriptions**: Each operation includes a human-readable description
- **Efficient Structure**: Reuses common properties (name, rank_type, ranks, score) and item entities

### Export Options
- **GRC-20 Edits Download**: Export ready-to-publish GRC-20 operations as JSON
- **Property Graph Download**: Export your tier list in property graph format
- **Console Logging**: View the full graph structure and GRC-20 IDs in the browser console

## Getting Started

### Prerequisites
- Node.js 18+ and pnpm

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd poc-geo-ranks

# Install dependencies
pnpm install

# Start development server
pnpm dev
```

### Usage

1. **Select a Category**: Choose from the available item collections on the home page
2. **Rank Items**: Drag items from the bottom pool into your desired tiers (S, A, B, C, D, F)
3. **View Graph**: Click "View Graph" to see the interactive React Flow visualization
4. **Prepare GRC-20 Edits**: Click "⚙️ Prepare GRC-20 Edits" to generate operations
   - Automatically prepares minimal GRC-20 operations
   - Shows summary of operations created
   - Displays preview of the edit structure
   - Download as `grc20-edits.json`
5. **Export**: Download the property graph as JSON for external use

## Data Structure

### Property Graph Format

The application uses a flexible property graph model where:

- **Entities** have an `id` and a `properties` object
- **Relations** have an `id`, `from`, `to`, and a `properties` object

Example:
```json
{
  "entities": [
    {
      "id": "tierlist-123",
      "properties": {
        "name": "Movies Tier List",
        "type": "weighted_rank"
      }
    },
    {
      "id": "item-456",
      "properties": {
        "name": "The Godfather"
      }
    }
  ],
  "relations": [
    {
      "id": "rel-789",
      "from": "tierlist-123",
      "to": "item-456",
      "properties": {
        "score": 6
      }
    }
  ]
}
```

## GRC-20 Integration

The application uses the `@graphprotocol/grc-20` SDK to prepare tier lists as GRC-20 operations (edits) ready for publishing to a decentralized knowledge graph.

### How It Works:
1. **Assumes Existing Data**: Properties (name, rank_type, ranks, score) and item entities are assumed to already exist in the graph
2. **Minimal Operations**: Only creates the TierList entity and ranking relations
3. **GRC-20 ID Generation**: Uses `IdUtils.generate()` to create valid GRC-20 IDs for all entities and relations
4. **Operation Descriptions**: Each operation includes a human-readable description for clarity

### What Gets Created:
- **TierList Entity**: A new entity with `name` and `rank_type` properties
- **Ranking Relations**: Relations from the TierList to each ranked item, with `score` as entityValues

The generated edit can be downloaded as JSON and is ready to be published to a GRC-20-compliant knowledge graph network.

## Technology Stack

- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: CSS with modern features (backdrop-filter, glassmorphism)
- **Graph Visualization**: React Flow (@xyflow/react)
- **Knowledge Graph**: @graphprotocol/grc-20 SDK
- **Package Manager**: pnpm

## Project Structure

```
src/
├── App.tsx              # Main application component
├── App.css              # Application styles
├── HomePage.tsx         # Category selection page
├── HomePage.css         # Homepage styles
├── GraphVisualization.tsx # React Flow graph component
├── categoryData.ts      # Pre-configured item collections
├── types.ts             # TypeScript interfaces
├── useGRC20.ts          # GRC-20 edits preparation hook
├── main.tsx             # Application entry point
└── index.css            # Global styles
```

## Design Philosophy

- **Clean & Modern UI**: No gradients, solid colors, glassmorphism effects
- **Accessibility**: Clear visual hierarchy and intuitive interactions
- **Performance**: Optimized rendering and state management
- **Flexibility**: Extensible data model for future enhancements

## Future Enhancements

- **Temporal Data**: Track when items were ranked and rank changes over time
- **User Attribution**: Multi-user collaborative rankings
- **Rich Properties**: Add images, descriptions, tags to items
- **Item Relations**: Create relationships between items (e.g., "similar to", "sequel of")
- **Multiple Tier Lists**: Compare and merge different ranking systems
- **Social Features**: Follow creators, like tier lists, community curation
- **Privacy Options**: Encrypted private tier lists

## Resources

- [GRC-20 SDK](https://www.npmjs.com/package/@graphprotocol/grc-20)
- [GRC-20 Standard](https://github.com/graphprotocol/grc-20)
- [React Flow Documentation](https://reactflow.dev/)
- [Property Graph Model](https://en.wikipedia.org/wiki/Graph_database#Labeled-property_graph)
