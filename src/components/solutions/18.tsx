import { AnswerChecker, matchesNumbers } from "../AnswerChecker";

export default function () {
  return (
    <AnswerChecker
      answers={[
        {
          label: "Number of cities",
          placeholder: "27",
          check: matchesNumbers(1753),
        },
      ]}
    />
  );
}
