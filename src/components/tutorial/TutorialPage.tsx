import React from 'react'
import TutorialFilters from './TutorialFilters'
import LearningPath from './LearningPath'
import PatternCard from './PatternCard'
import { BookOpen, Scissors } from 'lucide-react'

export default function TutorialPage() {
  const categories = ['All', 'Basics', 'Intermediate', 'Advanced']
  const [active, setActive] = React.useState('All')
  const patterns = Array.from({ length: 6 }).map((_, i) => ({
    id: i,
    name: ['Magic Ring', 'Invisible Decrease', 'Basic Increases'][i % 3],
    category: categories[(i % (categories.length - 1)) + 1],
    difficulty: ['Beginner', 'Intermediate', 'Advanced'][i % 3],
    timeToLearn: `${10 + i} min`,
    description: 'Step-by-step tutorial to master this technique.',
    instructions: [],
    videoUrl: '',
    patternUrl: '',
    tips: 'Practice slowly to build muscle memory.',
    uses: ['Amigurumi', 'Seams', 'Shaping'],
    icon: i % 2 === 0 ? <BookOpen className="h-4 w-4" /> : <Scissors className="h-4 w-4" />,
    featured: i % 3 === 0,
  }))

  const filtered = active === 'All' ? patterns : patterns.filter(p => p.category === active)
  const counts = patterns.reduce<Record<string, number>>((acc, p) => { acc[p.category] = (acc[p.category] || 0) + 1; return acc }, {})

  return (
    <div className="container py-8">
      <TutorialFilters categories={categories} activeFilter={active} onFilterChange={setActive} patternCounts={counts} />
      <LearningPath />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
        {filtered.map((pattern) => (
          <PatternCard key={pattern.id} pattern={pattern} />
        ))}
      </div>
    </div>
  )
}


