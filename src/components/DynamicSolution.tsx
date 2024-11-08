import { lazy, Suspense } from "react";

// this component allows us to dynamically import components for question results that are unique to each specific question.
export default ({ resultComponent }: { resultComponent: string }) => {
  // btw...be aware of footguns when engaging in jank
  // See https://github.com/rollup/plugins/tree/master/packages/dynamic-import-vars#limitations for supported dynamic import formats
  const Component = lazy(() => import(/* @vite-ignore */`./solutions/${resultComponent}`));

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Component />
    </Suspense>
  );
};
