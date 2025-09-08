import React from "react";

interface AspectRatioProps extends React.HTMLAttributes<HTMLDivElement> {
  ratio?: number; // e.g., 16/9 or 1 (square)
  children: React.ReactNode;
}

const AspectRatio: React.FC<AspectRatioProps> = ({ ratio = 1, children, style, ...props }) => {
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        paddingBottom: `${100 / ratio}%`,
        ...style,
      }}
      {...props}
    >
      <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}>
        {children}
      </div>
    </div>
  );
};

export default AspectRatio;
