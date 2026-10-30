import { AnswerChecker, matchesNumbers } from "../AnswerChecker";

export default function () {
  return (
    <AnswerChecker
      answers={[
        {
          label: "Number of digits",
          placeholder: "123",
          check: matchesNumbers(41),
        },
      ]}
    />
  );
}
