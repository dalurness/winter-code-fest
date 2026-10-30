import { AnswerChecker, matchesNumbers } from "../AnswerChecker";

export default function () {
  return (
    <AnswerChecker
      answers={[
        {
          label: "Start and end indexes",
          placeholder: "[10,14]",
          check: matchesNumbers(13257, 13278),
        },
      ]}
    />
  );
}
