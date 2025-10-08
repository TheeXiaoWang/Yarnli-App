const LearningPath = () => {
    const essentialTechniques = ["Magic Ring", "Single Crochet (sc)", "Increase (inc)", "Invisible Decrease (inv dec)"];
  
    return (
      <div className="mt-16 bg-gradient-to-r from-primary/5 to-accent/5 rounded-2xl p-8 border">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Recommended Learning Path
          </h2>
          <p className="text-muted-foreground">
            Start with these essential techniques to build your amigurumi skills
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {essentialTechniques.map((technique, index) => (
            <div key={technique} className="flex items-center gap-3 p-4 bg-card rounded-lg border">
              <div className="w-8 h-8 bg-primary text-[#ffffff] rounded-full flex items-center justify-center text-sm font-bold">
                {index + 1}
              </div>
              <div>
                <p className="font-medium text-sm">{technique}</p>
                <p className="text-xs text-gray-500">Essential skill</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };
  
  export default LearningPath;
  