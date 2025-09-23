import React from 'react'

interface Project {
  id: number;
  title: string;
  artist: string;
  artistAvatar: string;
  image: string;
  category: string;
  likes: number;
  views: number;
  difficulty: string;
  yarnType: string;
  timeToComplete: string;
  description: string;
  techniques: string[];
  colors: string[];
  datePosted: string;
  featured: boolean;
}

interface ProjectCardProps {
  project: Project;
}

const ProjectCard = ({ project }: ProjectCardProps) => {
  const colorMap: { [key: string]: string } = {
    'Sunset Orange': 'bg-orange-400',
    'Deep Gold': 'bg-yellow-500',
    'Warm Cream': 'bg-orange-100',
    'Ocean Blue': 'bg-blue-500',
    'Seafoam': 'bg-teal-300',
    'Pearl White': 'bg-gray-100',
    'Avocado Green': 'bg-green-400',
    'Brown': 'bg-amber-700',
    'Cream': 'bg-amber-50',
    'Rusty Orange': 'bg-orange-600',
    'Black': 'bg-gray-900',
    'Light Gray': 'bg-gray-300',
    'Pink': 'bg-pink-200',
    'Gray': 'bg-gray-400',
    'White': 'bg-white border border-gray-200',
    'Silver': 'bg-gray-300'
  };

  return (
    <div className="yarn-card group overflow-hidden cursor-pointer border hover:border-primary/50 transition-all duration-300 hover:shadow-lg rounded-2xl">
      {/* Image */}
      <div className="relative overflow-hidden">
        <img
          src={project.image}
          alt={project.title}
          className="w-full h-48 object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        {/* Featured Badge */}
        {project.featured && (
          <div className="absolute top-2 left-2">
            <span className="bg-accent text-accent-foreground text-xs flex items-center gap-1 px-2 py-1 rounded">
              ★ Featured
            </span>
          </div>
        )}

        {/* Hover Actions */}
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <button className="h-7 w-7 bg-white/20 backdrop-blur-md border border-white/30 hover:bg-white/30 rounded inline-flex items-center justify-center">❤</button>
          <button className="h-7 w-7 bg-white/20 backdrop-blur-md border border-white/30 hover:bg-white/30 rounded inline-flex items-center justify-center">⇩</button>
        </div>

        {/* Category Badge */}
        <div className="absolute bottom-2 left-2">
          <span className="bg-white/90 text-foreground text-xs px-2 py-0.5 rounded">
            {project.category}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-3 space-y-2">
        {/* Title */}
        <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors leading-tight text-sm">
          {project.title}
        </h3>
        
        {/* Artist Info */}
        <div className="flex items-center gap-2">
          <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center text-[10px]">
            {project.artist.split(' ').map(n => n[0]).join('')}
          </div>
          <span className="text-xs text-gray-500 truncate">{project.artist}</span>
        </div>

        {/* Quick Info */}
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <span>⏱</span>
            <span>{project.timeToComplete.split('-')[0]}h</span>
          </div>
          <span 
            className={`text-xs px-1 py-0 rounded border ${
              project.difficulty === 'Beginner' ? 'border-green-500 text-green-600' :
              project.difficulty === 'Intermediate' ? 'border-yellow-500 text-yellow-600' :
              'border-red-500 text-red-600'
            }`}
          >
            {project.difficulty}
          </span>
        </div>

        {/* Color Palette Preview */}
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 text-gray-500">🎨</span>
          <div className="flex gap-1 flex-1">
            {project.colors.slice(0, 3).map((color, index) => (
              <div 
                key={index}
                className={`w-3 h-3 rounded-full ${colorMap[color] || 'bg-primary/50'} shadow-sm`}
                title={color}
              />
            ))}
            {project.colors.length > 3 && (
              <div className="w-3 h-3 rounded-full bg-muted flex items-center justify-center">
                <span className="text-[6px] text-gray-500 font-medium">+{project.colors.length - 3}</span>
              </div>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between pt-1 border-t" style={{borderColor: 'hsl(var(--border))'}}>
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <div className="flex items-center gap-1 hover:text-primary transition-colors cursor-pointer">
              <span>❤</span>
              <span>{project.likes}</span>
            </div>
            <div className="flex items-center gap-1">
              <span>👁</span>
              <span>{project.views}k</span>
            </div>
          </div>
          <a className="yarn-button text-xs h-6 px-2 inline-flex items-center justify-center rounded" href="#">View</a>
        </div>
      </div>
    </div>
  );
};

export default ProjectCard;