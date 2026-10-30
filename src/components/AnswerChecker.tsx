import { useState, type ReactNode } from "react";
import { Button } from "./Button";
import { ModalStatusType, RightWrongModal } from "./RightWrongModal";

export interface Answer {
  label: string;
  placeholder?: string;
  rows?: number;
  check: Check;
  /**
   * Answers that are close to being right, like from a different way of reading the question,
   * with a hint for how to get to the right answer
   */
  close?: { check: Check; hint: ReactNode }[];
}

type Check = (input: string) => boolean | Promise<boolean>;

/**
 * Show an input and submit button for each answer, and a modal saying if it was right or wrong
 */
export function AnswerChecker({ answers }: { answers: Answer[] }) {
  const [showModal, setShowModal] = useState<ModalStatusType>(
    ModalStatusType.Closed
  );
  const [hint, setHint] = useState<ReactNode>();

  return (
    <>
      <RightWrongModal
        showModal={showModal}
        setShowModal={setShowModal}
        hint={hint}
      />
      <h2 className="mt-20">Check Your Answers</h2>
      {answers.map((answer) => (
        <AnswerInput
          key={answer.label}
          answer={answer}
          onResult={(status, hint) => {
            setHint(hint);
            setShowModal(status);
          }}
        />
      ))}
    </>
  );
}

function AnswerInput({
  answer: { label, placeholder, rows = 1, check, close = [] },
  onResult,
}: {
  answer: Answer;
  onResult: (status: ModalStatusType, hint?: ReactNode) => void;
}) {
  const [input, setInput] = useState("");

  async function checkAnswer() {
    if (await check(input)) {
      return onResult(ModalStatusType.Correct);
    }

    for (const { check, hint } of close) {
      if (await check(input)) {
        return onResult(ModalStatusType.Close, hint);
      }
    }

    onResult(ModalStatusType.Incorrect);
  }

  return (
    <div className="flex flex-col mb-4">
      <label className="mb-2">
        <b>{label}</b>
        <textarea
          className="block p-4 rounded-lg border border-yeti-light resize max-w-full"
          placeholder={placeholder}
          value={input}
          onChange={(e) => setInput(e.currentTarget.value)}
          rows={rows}
        ></textarea>
      </label>
      <Button onClick={checkAnswer} className="mr-auto">
        Submit
      </Button>
    </div>
  );
}

/**
 * Get all of the numbers in the input, ignoring anything else like brackets or commas
 */
export function numbers(input: string): number[] {
  return (input.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);
}

/**
 * Check that the input has exactly these numbers, in order
 */
export function matchesNumbers(...expected: number[]) {
  return (input: string) => {
    const actual = numbers(input);
    return (
      actual.length === expected.length &&
      actual.every((n, i) => n === expected[i])
    );
  };
}

/**
 * Normalize text output so that line endings, trailing whitespace on each line,
 * and blank lines at the start or end don't matter
 */
export function normalizeText(input: string): string {
  return input
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .replace(/^\n+|\n+$/g, "");
}

/**
 * Check that the input text matches the expected output. To keep the (sometimes very long)
 * answers out of the page, this is compared using a SHA-256 hash of the normalized text.
 * Generate the hash by running `normalizeText` on the expected output, then hashing it.
 */
export function matchesTextHash(expectedHash: string) {
  return async (input: string) =>
    (await sha256(normalizeText(input))) === expectedHash;
}

async function sha256(text: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text)
  );
  return Array.from(new Uint8Array(digest), (b) =>
    b.toString(16).padStart(2, "0")
  ).join("");
}
