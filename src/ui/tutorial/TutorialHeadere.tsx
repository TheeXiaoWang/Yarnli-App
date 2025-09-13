const TutorialHeader = () => {
    return (
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
          <span className="text-foreground">Crochet </span>
          <span className="bg-[var(--gradient-yarn-primary)] bg-clip-text text-transparent">
            Tutorials
          </span>
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Master the essential stitches and techniques for creating beautiful amigurumi
        </p>
      </div>
    );
  };
  
  export default TutorialHeader;