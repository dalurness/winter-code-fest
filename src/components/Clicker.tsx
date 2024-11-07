import { useState } from "react";

export default function () {
  const [count, setCount] = useState(0);
  return (
    <>
      <h1>This has some stuff goin on</h1>
      <p>the current count is: {count}</p>
      <button onClick={() => setCount((c) => c + 1)}>Increment</button>
    </>
  );
}
