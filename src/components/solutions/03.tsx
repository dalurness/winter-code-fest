import { AnswerChecker, matchesNumbers } from "../AnswerChecker";

const UPDATED_WORDING = (
  <p className="text-sm">
    The wording of this question used to be ambiguous, so we've updated it to be
    clearer.
  </p>
);

export default function () {
  return (
    <AnswerChecker
      answers={[
        {
          label: "Part 1: Number of valid codes",
          placeholder: "6",
          check: matchesNumbers(14),
        },
        {
          label: "Part 2: Number of parts added and removed",
          placeholder: "21 11",
          check: matchesNumbers(355, 174),
          close: [
            {
              check: matchesNumbers(129, 65),
              hint: (
                <>
                  <p>
                    It looks like some codes didn't get fully fixed. The swaps
                    go both ways, so an <code>A</code> in the check spot is
                    really a <code>C</code>, and an <code>R</code> in the
                    package spot is really a <code>P</code>. Once fixed, every
                    code is valid.
                  </p>
                  {UPDATED_WORDING}
                </>
              ),
            },
            {
              check: matchesNumbers(455, 274),
              hint: (
                <>
                  <p>
                    It looks like you counted the last two commands of each code
                    as parts. Those are always the check and package steps, so
                    only count the commands before them.
                  </p>
                  {UPDATED_WORDING}
                </>
              ),
            },
          ],
        },
      ]}
    />
  );
}
