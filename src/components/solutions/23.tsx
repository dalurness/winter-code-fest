import { useState } from "react";
import { Button } from "../Button";
import { ModalStatusType, RightWrongModal } from "../RightWrongModal";

export default function () {
  const [showModal, setShowModal] = useState<ModalStatusType>(
    ModalStatusType.Closed
  );

  function SignInput() {
    const [input, setInput] = useState("");

    function checkSolution() {
      const correct = input.trim().toLowerCase() === sign;

      setShowModal(
        correct ? ModalStatusType.Correct : ModalStatusType.Incorrect
      );
    }

    return (
      <div className="flex flex-col mb-4">
        <label className="mb-2">
          <b>What does the sign say?</b>
          <input
            type="text"
            className="block p-4 rounded-lg border border-yeti-light max-w-full"
            placeholder="Merry..."
            value={input}
            onChange={(e) => setInput(e.currentTarget.value)}
          />
        </label>
        <Button onClick={checkSolution} className="mr-auto">
          Submit
        </Button>
      </div>
    );
  }

  function PixelInput() {
    const [input, setInput] = useState("");

    function checkSolution() {
      let correct = true;

      const found: Record<string, [number, number, number]> = {};
      // parse input into lines like "118,16: 244,238,205"
      for (let line of input.trim().split("\n")) {
        line = line.trim();
        if (!line) {
          // allow empty lines
          continue;
        }

        const parts = line.match(
          /^(\d+)\s*,\s*(\d+)\s*:\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)$/
        );
        if (!parts) {
          correct = false;
          break;
        }

        found[`${parts[1]},${parts[2]}`] = [
          parseInt(parts[3]!, 10),
          parseInt(parts[4]!, 10),
          parseInt(parts[5]!, 10),
        ];
      }

      if (correct) {
        // every expected pixel must be present and within the tolerance
        for (const [pixel, expected] of Object.entries(pixels)) {
          const actual = found[pixel];
          if (
            !actual ||
            expected.some((value, i) => Math.abs(value - actual[i]!) > 1)
          ) {
            correct = false;
            break;
          }

          delete found[pixel];
        }

        // check if any remaining pixels in the user input
        if (correct && Object.keys(found).length !== 0) {
          correct = false;
        }
      }

      setShowModal(
        correct ? ModalStatusType.Correct : ModalStatusType.Incorrect
      );
    }

    return (
      <div className="flex flex-col mb-4">
        <label className="mb-2">
          <b>Pixel colors</b>
          <textarea
            className="block p-4 rounded-lg border border-yeti-light resize max-w-full"
            placeholder={["118,16: 255,255,255", "28,52: 0,0,0", "..."].join(
              "\n"
            )}
            value={input}
            onChange={(e) => setInput(e.currentTarget.value)}
            rows={5}
          ></textarea>
        </label>
        <Button onClick={checkSolution} className="mr-auto">
          Submit
        </Button>
      </div>
    );
  }

  return (
    <>
      <RightWrongModal showModal={showModal} setShowModal={setShowModal} />
      <h2 className="mt-20">Check Your Answers</h2>
      <SignInput />
      <PixelInput />
    </>
  );
}

const sign = "jolly";

// "x,y" -> [red, green, blue] (an off-by-one is accepted for rounding)
const pixels: Record<string, [number, number, number]> = {
  "118,16": [244, 238, 205],
  "28,52": [30, 124, 57],
  "140,48": [210, 33, 43],
  "57,80": [195, 145, 83],
  "76,69": [65, 36, 17],
};
