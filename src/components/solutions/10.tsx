import { AnswerChecker, matchesNumbers } from "../AnswerChecker";

export default function () {
  return (
    <AnswerChecker
      answers={[
        {
          label: "First, median, and last numbers",
          placeholder: "[0,4,9]",
          check: matchesNumbers(0, 87, 175),
        },
        {
          label: "Missing presents",
          placeholder: "[6]",
          check: matchesNumbers(22, 107, 114),
        },
      ]}
    />
  );
}
