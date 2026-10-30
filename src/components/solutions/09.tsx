import { AnswerChecker } from "../AnswerChecker";

export default function () {
  return (
    <AnswerChecker
      answers={[
        {
          label: "Key for secret1.txt - secret6.txt",
          placeholder: "XmasXmas",
          check: (input) => input.trim() === "deerHugs",
        },
      ]}
    />
  );
}
