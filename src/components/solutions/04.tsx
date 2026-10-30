import { AnswerChecker, matchesNumbers } from "../AnswerChecker";

export default function () {
  return (
    <AnswerChecker
      answers={[
        {
          label: "Total minutes",
          placeholder: "123",
          check: matchesNumbers(2803),
        },
      ]}
    />
  );
}
