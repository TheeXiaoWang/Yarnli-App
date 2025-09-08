import React from 'react'

interface LoadMoreButtonProps {
  projectCount: number;
}

const LoadMoreButton = ({ projectCount }: LoadMoreButtonProps) => {
  return (
    <div className="text-center mt-12">
      <button className="yarn-card px-4 py-2 rounded-2xl inline-flex items-center">
        Load More Projects
        <span className="ml-2 text-xs bg-background/60 px-2 py-0.5 rounded border">
          {projectCount} shown
        </span>
      </button>
    </div>
  );
};

export default LoadMoreButton;