import { AnswerChecker, matchesNumbers } from "../AnswerChecker";

export default function () {
  return (
    <AnswerChecker
      answers={[
        {
          label: "Arrangements for a sleigh of length 30",
          placeholder: "123",
          check: matchesNumbers(8183372),
        },
      ]}
    />
  );
}
