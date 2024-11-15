// this component allows us to dynamically import components for question results that are unique to each specific question.

// https://vite.dev/guide/features.html#glob-import
const solutions: Record<string, astroHTML.JSX.Element> = import.meta.glob(
  "./solutions/*",
  { eager: true, import: "default" }
);
export function DynamicSolution({ day }: { day: number }) {
  const path = `./solutions/${day.toString().padStart(2, "0")}.tsx`;
  const Component = solutions[path];

  if (!Component) return null;

  return <Component />;
}
