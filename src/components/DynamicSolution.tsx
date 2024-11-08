// this component allows us to dynamically import components for question results that are unique to each specific question.

// https://vite.dev/guide/features.html#glob-import
let x: Record<string, astroHTML.JSX.Element> = import.meta.glob('./solutions/*', { eager: true, import: "default" })
export function DynamicSolution({ resultComponent }: { resultComponent: string }) {
  let path = `./solutions/${resultComponent}.tsx`
  let Component = x[path]

  if (!Component) return null

  return (
    <Component />
  )
};
