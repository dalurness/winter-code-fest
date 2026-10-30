import { AnswerChecker } from "../AnswerChecker";

export default function () {
  return (
    <AnswerChecker
      answers={[
        {
          label: "What does the sign say?",
          placeholder: "Merry...",
          check: (input) => input.trim().toLowerCase() === sign,
        },
        {
          label: "Pixel colors",
          placeholder: ["118,16: 255,255,255", "28,52: 0,0,0", "..."].join(
            "\n"
          ),
          rows: 5,
          check: checkPixels,
        },
      ]}
    />
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

function checkPixels(input: string): boolean {
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
      return false;
    }

    found[`${parts[1]},${parts[2]}`] = [
      parseInt(parts[3]!, 10),
      parseInt(parts[4]!, 10),
      parseInt(parts[5]!, 10),
    ];
  }

  // every expected pixel must be present and within the tolerance
  for (const [pixel, expected] of Object.entries(pixels)) {
    const actual = found[pixel];
    if (
      !actual ||
      expected.some((value, i) => Math.abs(value - actual[i]!) > 1)
    ) {
      return false;
    }

    delete found[pixel];
  }

  // check if any remaining pixels in the user input
  return Object.keys(found).length === 0;
}
