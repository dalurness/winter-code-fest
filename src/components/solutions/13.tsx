import { AnswerChecker } from "../AnswerChecker";

export default function () {
  return (
    <AnswerChecker
      answers={(
        [
          ["letter1.txt", "Thomas TRAIN"],
          ["letter2.txt", "Lincoln LOGS"],
          ["letter3.txt", "Cap GUN"],
        ] as const
      ).map(([fileName, expected]) => ({
        label: fileName,
        placeholder: "Buddy SPAGHETTI",
        // only compare the letters so any formatting of the output works
        check: (input) => lettersOnly(input) === lettersOnly(expected),
      }))}
    />
  );
}

function lettersOnly(text: string): string {
  return text.replace(/[^a-z]/gi, "").toUpperCase();
}
