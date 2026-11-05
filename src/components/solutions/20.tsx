import { AnswerChecker, numbers } from "../AnswerChecker";

const SWAPS = [48, 43, 44, 46, 45, 41, 49, 46, 44, 47];

export default function () {
  return (
    <AnswerChecker
      answers={[
        {
          label: "Least number of swaps for each batch",
          placeholder: ["3", "1"].join("\n"),
          rows: 3,
          // only use the first number on each line so the challenge output works too
          check: (input) => {
            const swaps = input
              .split("\n")
              .filter((line) => line.trim())
              .map((line) => numbers(line)[0]);
            return (
              swaps.length === SWAPS.length &&
              swaps.every((n, i) => n === SWAPS[i])
            );
          },
        },
      ]}
    />
  );
}
