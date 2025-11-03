import './HomePage.css'

interface Category {
  id: string
  name: string
  emoji: string
  description: string
  itemCount: number
}

interface HomePageProps {
  onSelectCategory: (categoryId: string) => void
}

const categories: Category[] = [
  {
    id: 'food',
    name: 'Food',
    emoji: '🍕',
    description: 'Rank your favorite foods and snacks',
    itemCount: 16,
  },
  {
    id: 'movies',
    name: 'Movies',
    emoji: '🎬',
    description: 'Create a rank of classic and modern films',
    itemCount: 16,
  },
  {
    id: 'podcasts',
    name: 'Podcasts',
    emoji: '🎙️',
    description: 'Rank popular podcast shows',
    itemCount: 16,
  },
  {
    id: 'videogames',
    name: 'Video Games',
    emoji: '🎮',
    description: 'Rank the greatest video games of all time',
    itemCount: 16,
  },
  {
    id: 'music',
    name: 'Music Genres',
    emoji: '🎵',
    description: 'Rank different music genres and styles',
    itemCount: 16,
  },
  {
    id: 'sports',
    name: 'Sports',
    emoji: '⚽',
    description: 'Rank different sports and activities',
    itemCount: 16,
  },
]

export function HomePage({ onSelectCategory }: HomePageProps) {
  return (
    <div className="homepage">
      <div className="homepage-header">
        <h1>🎯 Rank Maker</h1>
        <p className="homepage-subtitle">
          Create knowledge graphs by ranking items into ranks
        </p>
      </div>

      <div className="categories-grid">
        {categories.map((category) => (
          <div
            key={category.id}
            className="category-card"
            onClick={() => onSelectCategory(category.id)}
          >
            <div className="category-emoji">{category.emoji}</div>
            <h3 className="category-name">{category.name}</h3>
            <p className="category-description">{category.description}</p>
            <div className="category-meta">
              {category.itemCount} items
            </div>
          </div>
        ))}
      </div>

      <div className="homepage-footer">
        <p>Select a category to start building your ranking graph</p>
      </div>
    </div>
  )
}

