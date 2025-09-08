import React, { createContext, useContext, forwardRef, useId } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

// Dummy data for the chart
const data = [
  { name: "Jan", uv: 400 },
  { name: "Feb", uv: 300 },
  { name: "Mar", uv: 500 },
  { name: "Apr", uv: 200 },
  { name: "May", uv: 600 },
];

// Theme mapping (optional)
const THEMES = { light: "", dark: ".dark" } as const;

export type ChartConfig = {
  [key: string]: {
    label?: React.ReactNode;
    icon?: React.ComponentType;
  } & (
    | { color?: string; theme?: never }
    | { color?: never; theme: Record<keyof typeof THEMES, string> }
  );
};

type ChartContextType = {
  config: ChartConfig;
};

const ChartContext = createContext<ChartContextType | null>(null);

export function useChart() {
  const context = useContext(ChartContext);
  if (!context) throw new Error("useChart must be used within a <ChartContainer />");
  return context;
}

export const ChartContainer = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    config: ChartConfig;
    children?: React.ReactNode;
  }
>(({ className = "", config, id, children, ...props }, ref) => {
  const uniqueId = useId();
  const chartId = `chart-${id || uniqueId.replace(/:/g, "")}`;

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-chart={chartId}
        ref={ref}
        className={`flex aspect-video justify-center text-xs ${className}`}
        {...props}
      >
        <ChartStyle id={chartId} config={config} />
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="uv" stroke="#8884d8" />
          </LineChart>
        </ResponsiveContainer>
        {children}
      </div>
    </ChartContext.Provider>
  );
});
ChartContainer.displayName = "ChartContainer";

const ChartStyle = ({
  id,
  config,
}: {
  id: string;
  config: ChartConfig;
}) => {
  const styles = Object.entries(THEMES)
    .map(([theme, prefix]) => {
      const lines = Object.entries(config)
        .map(([key, conf]) => {
          const color = conf.theme?.[theme as keyof typeof conf.theme] || conf.color;
          return color ? `  --color-${key}: ${color};` : null;
        })
        .filter(Boolean)
        .join("\n");

      return `${prefix} [data-chart="${id}"] {\n${lines}\n}`;
    })
    .join("\n");

  return <style dangerouslySetInnerHTML={{ __html: styles }} />;
};
