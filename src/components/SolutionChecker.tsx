import { useState } from "react";
import { Button } from "./Button";

interface Props {
  solution: string;
}

export function SolutionChecker({ solution }: Props) {
  const [input, setInput] = useState("");

  function checkSolution() {
    if (input === solution) {
      alert("Correct!");
    } else {
      alert("Try again...");
    }
  }

  return (
    <>
      <label className="mb-4">
        Check your answer:
        <textarea
          className="block p-4 rounded-lg"
          placeholder="42"
          value={input}
          onChange={(e) => setInput(e.currentTarget.value)}
        ></textarea>
      </label>
      <Button onClick={checkSolution}>Submit</Button>
    </>
  );
}
