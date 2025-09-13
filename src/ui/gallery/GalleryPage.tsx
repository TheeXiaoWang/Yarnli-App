import React from 'react'
import GalleryHeader from './GalleryHeader'
import GalleryFilters from './GalleryFilters'
import ProjectCard from './ProjectCard'

export default function GalleryPage() {
  const categories = ['All', 'Amigurumi', 'Wearables', 'Home Decor']
  const [active, setActive] = React.useState('All')
  const projects = Array.from({ length: 8 }).map((_, i) => ({
    id: i,
    title: `Project #${i + 1}`,
    artist: 'Yarn Artist',
    artistAvatar: '',
    image: 'https://picsum.photos/seed/yarn' + i + '/600/400',
    category: categories[(i % (categories.length - 1)) + 1],
    likes: 12 + i,
    views: 3 + i,
    difficulty: ['Beginner', 'Intermediate', 'Advanced'][i % 3],
    yarnType: 'Worsted',
    timeToComplete: `${2 + i}-4h`,
    description: 'A lovely handcrafted yarn project.',
    techniques: ['Magic Ring', 'SC'],
    colors: ['Sunset Orange', 'Cream', 'Brown'],
    datePosted: '2025-01-01',
    featured: i % 4 === 0,
  }))

  const filtered = active === 'All' ? projects : projects.filter(p => p.category === active)
  const counts = projects.reduce<Record<string, number>>((acc, p) => { acc[p.category] = (acc[p.category] || 0) + 1; return acc }, {})

  return (
    <div className="container py-8">
      <GalleryHeader />
      <GalleryFilters categories={categories} activeFilter={active} onFilterChange={setActive} projectCounts={counts} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
        {filtered.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </div>
    </div>
  )
}


