import { AnswerChecker, matchesNumbers } from "../AnswerChecker";

export default function () {
  return (
    <AnswerChecker
      answers={[
        {
          label: "Total weight of off balance trees",
          placeholder: "51",
          check: matchesNumbers(580),
        },
      ]}
    />
  );
}
