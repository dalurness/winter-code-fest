import { AnswerChecker, matchesNumbers } from "../AnswerChecker";

export default function () {
  return (
    <AnswerChecker
      answers={[
        {
          label: "Minutes double booked",
          placeholder: "3",
          check: matchesNumbers(600),
        },
      ]}
    />
  );
}
