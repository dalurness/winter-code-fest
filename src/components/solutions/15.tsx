import { AnswerChecker, matchesTextHash } from "../AnswerChecker";

export default function () {
  return (
    <AnswerChecker
      answers={[
        {
          label: "Decrypted message",
          placeholder: "My Dearest...",
          rows: 3,
          check: matchesTextHash(
            "e9ce6e93400bebe954cd990f726f9621f4c3b0f0b16df9df73cd3617dc07cb4f"
          ),
        },
      ]}
    />
  );
}
