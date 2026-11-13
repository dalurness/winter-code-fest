import { AnswerChecker } from "../AnswerChecker";

const OPTIMAL_DISTANCE = 68;
const OPTIMAL_DISTANCE_BIG = 335;

export default function () {
  return (
    <AnswerChecker
      answers={[
        {
          label: "Path",
          placeholder: "2N27E5S",
          check: async (input) =>
            (await pathDistance("./map.txt", input)) !== undefined,
        },
        {
          label: "Challenge: Optimal path",
          placeholder: "2N27E5S",
          check: async (input) =>
            (await pathDistance("./map.txt", input)) === OPTIMAL_DISTANCE,
        },
        {
          label: "Bigger Challenge: Path on map-big.txt",
          placeholder: "2N27E5S",
          check: async (input) =>
            (await pathDistance("./map-big.txt", input)) !== undefined,
        },
        {
          label: "Bigger Challenge: Optimal path on map-big.txt",
          placeholder: "2N27E5S",
          check: async (input) =>
            (await pathDistance("./map-big.txt", input)) ===
            OPTIMAL_DISTANCE_BIG,
        },
      ]}
    />
  );
}

/**
 * Follow the path on the map and get the total distance traveled,
 * or undefined if it isn't a valid path from S to E
 */
async function pathDistance(
  mapFile: string,
  input: string
): Promise<number | undefined> {
  const path = input.replace(/\s/g, "").toUpperCase();
  if (!/^(\d+[NSEW])+$/.test(path)) {
    return undefined;
  }

  const map = (await (await fetch(mapFile)).text())
    .split(/\r?\n/)
    .filter(Boolean);

  let y = map.findIndex((row) => row.includes("S"));
  let x = map[y]!.indexOf("S");
  let distance = 0;

  for (const [, count, direction] of path.matchAll(/(\d+)([NSEW])/g)) {
    const [dx, dy] = (
      {
        N: [0, -1],
        S: [0, 1],
        E: [1, 0],
        W: [-1, 0],
      } as const
    )[direction as "N" | "S" | "E" | "W"];

    for (let i = 0; i < Number(count); i++) {
      x += dx;
      y += dy;
      distance++;

      const spot = map[y]?.[x];
      if (spot === undefined || spot === "X") {
        return undefined;
      }
    }
  }

  return map[y]![x] === "E" ? distance : undefined;
}
