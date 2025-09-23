const GalleryHeader = () => {
    return (
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
          <span className="text-foreground">Community </span>
          <span className="bg-[var(--gradient-yarn-primary)] bg-clip-text text-transparent">
            Gallery
          </span>
        </h1>
        <p className="text-xl text-gray-500 max-w-2xl mx-auto">
          Discover amazing yarn art creations from our talented community of artists
        </p>
      </div>
    );
  };
  
  export default GalleryHeader;
  