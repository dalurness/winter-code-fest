import { AnswerChecker, matchesNumbers } from "../AnswerChecker";

export default function () {
  return (
    <AnswerChecker
      answers={[
        {
          label: "Sum of the first 50,000 Elf Numbers",
          placeholder: "123",
          check: matchesNumbers(3489774699),
        },
      ]}
    />
  );
}
