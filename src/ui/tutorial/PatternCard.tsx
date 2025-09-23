import React from 'react'

interface Pattern {
  id: number;
  name: string;
  category: string;
  difficulty: string;
  timeToLearn: string;
  description: string;
  instructions: string[];
  videoUrl: string;
  patternUrl: string;
  tips: string;
  uses: string[];
  icon: React.ReactNode;
  featured: boolean;
}

interface PatternCardProps {
  pattern: Pattern;
}

const PatternCard = ({ pattern }: PatternCardProps) => {
  return (
    <div className="yarn-card group hover:shadow-lg transition-all duration-300 border-2 hover:border-primary/50 rounded-2xl">
      <div className="pb-4 p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              {pattern.icon}
            </div>
            <div>
              <div className="text-lg font-bold group-hover:text-primary transition-colors">
                {pattern.name}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs px-2 py-0.5 rounded border">{pattern.category}</span>
                {pattern.featured && (
                  <span className="bg-accent text-accent-foreground text-xs flex items-center gap-1 px-2 py-0.5 rounded">
                    ★ Essential
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4 p-4 pt-0">
        {/* Description */}
        <p className="text-sm text-gray-500 leading-relaxed">
          {pattern.description}
        </p>

        {/* Quick Info */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1">
            <span>⏱</span>
            <span className="text-gray-500">{pattern.timeToLearn}</span>
          </div>
          <span 
            className={`text-xs px-2 py-0.5 rounded border ${
              pattern.difficulty === 'Beginner' ? 'border-green-500 text-green-600' :
              pattern.difficulty === 'Intermediate' ? 'border-yellow-500 text-yellow-600' :
              'border-red-500 text-red-600'
            }`}
          >
            {pattern.difficulty}
          </span>
        </div>

        {/* Uses */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Common Uses</p>
          <div className="flex flex-wrap gap-1">
            {pattern.uses.slice(0, 2).map((use, index) => (
              <span key={index} className="text-xs bg-muted text-gray-500 px-2 py-1 rounded">
                {use}
              </span>
            ))}
            {pattern.uses.length > 2 && (
              <span className="text-xs text-gray-500">
                +{pattern.uses.length - 2} more
              </span>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <a className="yarn-button flex-1 inline-flex items-center justify-center rounded px-3 py-2 text-sm" href="#">▶ Watch Tutorial</a>
          <a className="yarn-card border inline-flex items-center gap-1 rounded px-3 py-2 text-sm" href="#">📄 Pattern</a>
        </div>

        {/* Pro Tip */}
        {pattern.tips && (
          <div className="bg-muted/50 p-3 rounded-lg border-l-4 border-primary/50">
            <p className="text-xs font-medium text-foreground mb-1">💡 Pro Tip</p>
            <p className="text-xs text-gray-500">{pattern.tips}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PatternCard;