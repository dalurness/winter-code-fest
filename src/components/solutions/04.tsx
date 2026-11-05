import { AnswerChecker, matchesTextHash } from "../AnswerChecker";

export default function () {
  return (
    <AnswerChecker
      answers={(
        [
          [
            "0.txt",
            "a11cc548058d504b37bffd9a0ba0eaf0ad4eb7e4f7ea2d3b4347ef56bd22953f",
          ],
          [
            "1.txt",
            "19b323d6f0d0997f9f168fe1ac60e1c7af8a7f28f638fbe42b3799cba615f1a8",
          ],
          [
            "2.txt",
            "8650ca11bd7707ccb7c25216493f5552b3f31717397e876836e93fa442bbf5a2",
          ],
          [
            "3.txt",
            "cf799cdc30fd34559df0b1b52502ad002a81ceae4aa26e48835b8fe7eb365229",
          ],
          [
            "4.txt",
            "830b6ce4175808b9b3c4044d56c6e421113d4af14a6b89b1cf4b12b04f977c89",
          ],
          [
            "5.txt",
            "9cc048e4dbee36aebb4c9474dd7ebdb85bd5f93902e7d9fd51b2748ce2c47f0e",
          ],
        ] as const
      ).map(([fileName, hash]) => ({
        label: fileName,
        placeholder: [" 1", "2 4", " 3"].join("\n"),
        rows: 3,
        check: matchesTextHash(hash),
      }))}
    />
  );
}
