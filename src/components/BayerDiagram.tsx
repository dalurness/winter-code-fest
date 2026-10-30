const COLORS: Record<"R" | "G" | "B", string> = {
  R: "bg-red-200 text-red-900",
  G: "bg-green-200 text-green-900",
  B: "bg-blue-200 text-blue-900",
};

function Cell({ letter }: { letter: "R" | "G" | "B" }) {
  return (
    <div
      className={`flex size-10 items-center justify-center rounded font-bold ${COLORS[letter]}`}
    >
      {letter}
    </div>
  );
}

/**
 * Shows a single 2x2 Bayer block, then the same block tiled across a larger
 * grid so it's clear the tiling diagram isn't itself "a block".
 */
export function BayerDiagram() {
  const block: ("R" | "G" | "B")[][] = [
    ["R", "G"],
    ["G", "B"],
  ];

  return (
    <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-10">
      <div className="flex flex-col items-center gap-2">
        <div className="grid grid-cols-2 gap-1 rounded-lg border-2 border-yeti-dark-7 p-1">
          {block.map((row, y) =>
            row.map((letter, x) => <Cell key={`${x},${y}`} letter={letter} />)
          )}
        </div>
        <p className="text-sm text-yeti-dark-3">One 2×2 block</p>
      </div>

      <div className="flex flex-col items-center gap-2">
        <div className="grid grid-cols-4 gap-1 rounded-lg p-1">
          {Array.from({ length: 4 }, (_, blockY) =>
            Array.from({ length: 4 }, (_, blockX) => {
              const letter = block[blockY % 2]![blockX % 2]!;
              const isFirstBlock = blockX < 2 && blockY < 2;
              return (
                <div
                  key={`${blockX},${blockY}`}
                  className={
                    isFirstBlock
                      ? "rounded-sm ring-2 ring-yeti-dark-7 ring-inset"
                      : ""
                  }
                >
                  <Cell letter={letter} />
                </div>
              );
            })
          )}
        </div>
        <p className="text-sm text-yeti-dark-3">
          Tiles across the sensor (first block outlined)
        </p>
      </div>
    </div>
  );
}
