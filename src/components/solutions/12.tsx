import { AnswerChecker, matchesTextHash } from "../AnswerChecker";

export default function () {
  return (
    <AnswerChecker
      answers={(
        [
          [
            "input1.txt",
            "cc078bc6b9a3eeb6d1aa16d9d427a251cc86174ba0bf848c704d1a1699db1754",
          ],
          [
            "input2.txt",
            "c608b1767b027f2ef888048c3c84351b8667a2b872c044aed89c095b844dbe05",
          ],
          [
            "input3.txt",
            "2bada90cc146b4cb1a8bd5c706dfa23cf90bb591bb6b872933325250efbdb3c2",
          ],
          [
            "input4.txt",
            "1b5d94f571e56f1d147674cd4658044ab02fe1413131b2115aa47972ab732965",
          ],
        ] as const
      ).map(([fileName, hash]) => ({
        label: fileName,
        placeholder: "I'm dreaming of a white Christmas...",
        rows: 3,
        check: matchesTextHash(hash),
      }))}
    />
  );
}
