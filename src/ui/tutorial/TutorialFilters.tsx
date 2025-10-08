import React from 'react'

interface TutorialFiltersProps {
  categories: string[];
  activeFilter: string;
  onFilterChange: (filter: string) => void;
  patternCounts: { [key: string]: number };
}

const TutorialFilters = ({ categories, activeFilter, onFilterChange, patternCounts }: TutorialFiltersProps) => {
  return (
    <div className="flex flex-wrap gap-3 justify-center mb-8">
      {categories.map((category) => (
        <button
          key={category}
          className={`px-4 py-2 rounded-xl border transition-all duration-200 ${
            category === activeFilter 
              ? "yarn-button bg-primary text-[#ffffff] shadow-md scale-105" 
              : "yarn-card hover:bg-primary/10 hover:border-primary/50"
          }`}
          onClick={() => onFilterChange(category)}
        >
          <span>{category}</span>
          {category !== "All" && (
            <span className="ml-2 text-xs bg-card/50 rounded px-2 py-0.5 border">
              {patternCounts[category] || 0}
            </span>
          )}
        </button>
      ))}
    </div>
  );
};

export default TutorialFilters;