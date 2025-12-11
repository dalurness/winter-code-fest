---
descriptions: ["deno"]
---

### 2025 Solution Deno

### Output

```
Path: 8N9E2N2E4N11E3N3E1N25E
```

```ts
interface Coordinates {
  x: number;
  y: number;
}

interface Node {
  path: string;
  coordinates: Coordinates;
}

class Mapper {
  private map: string[];
  private visitedMap: Map<string, boolean>;
  private startingCoordinates: Coordinates = { x: 0, y: 0 };
  private endingCoordinates: Coordinates = { x: 0, y: 0 };

  constructor(mapSpec: string[]) {
    this.map = mapSpec;
    this.startingCoordinates = this.findCoordinates("S");
    this.endingCoordinates = this.findCoordinates("E");
    this.visitedMap = new Map();
  }

  private coordKey(x: number, y: number) {
    return `${x},${y}`;
  }

  private findCoordinates(symbol: string): Coordinates {
    let coordinates: Coordinates = { x: 0, y: 0 };
    for (let y = 0; y < this.map.length; y++) {
      for (let x = 0; x < this.map[y].length; x++) {
        if (this.map[y][x] === symbol) {
          coordinates = { x, y };
        }
      }
    }
    return coordinates;
  }

  private isValidMove(x: number, y: number): boolean {
    if (x < 0 || y < 0 || y >= this.map.length || x >= this.map[0].length) {
      return false;
    }
    if (this.map[y][x] === "X" || this.map[y][x] === "S") {
      return false;
    }
    if (this.visitedMap.get(this.coordKey(x, y)) === true) {
      return false;
    }
    return true;
  }

  public getPath(): string {
    const path = this.findPath([
      { path: "", coordinates: this.startingCoordinates },
    ]);
    let directions = "";
    for (let i = 0; i < path.length; ) {
      const curLetter = path[i];
      let letterCounter = 0;
      while (true) {
        if (path[i] === curLetter) {
          letterCounter++;
          i++;
        } else {
          break;
        }
      }
      directions += String(letterCounter) + curLetter;
    }
    return directions;
  }

  private findPath(checkList: Node[]): string {
    const newCheckList: Node[] = [];
    for (const path of checkList) {
      if (
        path.coordinates.x === this.endingCoordinates.x &&
        path.coordinates.y === this.endingCoordinates.y
      ) {
        return path.path;
      }
      if (this.isValidMove(path.coordinates.x, path.coordinates.y - 1)) {
        // check up
        newCheckList.push({
          path: path.path + "N",
          coordinates: { x: path.coordinates.x, y: path.coordinates.y - 1 },
        });
        this.visitedMap.set(
          this.coordKey(path.coordinates.x, path.coordinates.y - 1),
          true
        );
      }
      if (this.isValidMove(path.coordinates.x, path.coordinates.y + 1)) {
        //check down
        newCheckList.push({
          path: path.path + "S",
          coordinates: { x: path.coordinates.x, y: path.coordinates.y + 1 },
        });
        this.visitedMap.set(
          this.coordKey(path.coordinates.x, path.coordinates.y + 1),
          true
        );
      }
      if (this.isValidMove(path.coordinates.x - 1, path.coordinates.y)) {
        //check left
        newCheckList.push({
          path: path.path + "W",
          coordinates: { x: path.coordinates.x - 1, y: path.coordinates.y },
        });
        this.visitedMap.set(
          this.coordKey(path.coordinates.x - 1, path.coordinates.y),
          true
        );
      }
      if (this.isValidMove(path.coordinates.x + 1, path.coordinates.y)) {
        //check right
        newCheckList.push({
          path: path.path + "E",
          coordinates: { x: path.coordinates.x + 1, y: path.coordinates.y },
        });
        this.visitedMap.set(
          this.coordKey(path.coordinates.x + 1, path.coordinates.y),
          true
        );
      }
    }
    return this.findPath(newCheckList);
  }
}

if (import.meta.main) {
  const map = (await Deno.readTextFile("map.txt")).split("\n");
  const mapper = new Mapper(map);
  console.log(mapper.getPath());
}
```
