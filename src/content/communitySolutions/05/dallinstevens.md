---
descriptions: ["deno"]
---

### 2025 Solution Deno

```ts
interface Coordinates {
  x: number;
  y: number;
}

class Canvas {
  private commands: string[];
  private grid: string[][];
  private currentPosition: Coordinates;

  constructor(commands: string[]) {
    this.commands = commands;
    this.grid = [];
    this.currentPosition = { x: 0, y: 0 };
  }

  private ensureGridSize() {
    if (this.currentPosition.y >= this.grid.length) {
      const newColsNeeded = this.currentPosition.y - this.grid.length + 1;
      for (let i = 0; i < newColsNeeded; i++) {
        this.grid.push([" "]);
      }
    }
    if (this.currentPosition.x > this.grid[this.currentPosition.y].length) {
      const newRowsNeeded =
        this.currentPosition.x - this.grid[this.currentPosition.y].length;
      for (let i = 0; i < newRowsNeeded; i++) {
        this.grid[this.currentPosition.y].push(" ");
      }
    }
  }

  private moveX(amount: number) {
    this.currentPosition.x += amount;
    if (this.currentPosition.x < 0) {
      throw new Error("Negative X Value. Out of bounds");
    }
  }

  private moveY(amount: number) {
    this.currentPosition.y += amount;
    if (this.currentPosition.x < 0) {
      throw new Error("Negative Y Value. Out of bounds");
    }
  }

  private printValue(value: string) {
    this.ensureGridSize();
    this.grid[this.currentPosition.y][this.currentPosition.x] = value;
  }

  public executeCommands() {
    for (const command of this.commands) {
      console.log(command);
      if (command == "P-") {
        console.clear();
      }
      if (command == "LR") {
        this.currentPosition = { x: 0, y: 0 };
      } else {
        switch (command[0]) {
          case "U":
            this.moveY(-Number(command.slice(1)));
            break;
          case "D":
            this.moveY(Number(command.slice(1)));
            break;
          case "L":
            this.moveX(-Number(command.slice(1)));
            break;
          case "R":
            this.moveX(Number(command.slice(1)));
            break;
          case "P":
            this.printValue(command.slice(1));
            break;
        }
      }
    }
  }

  public printGrid() {
    for (const row of this.grid) {
      console.log(row.join(""));
    }
  }
}

if (import.meta.main) {
  const commands = (await Deno.readTextFile("5.txt")).split("\n");

  const canvas = new Canvas(commands);
  canvas.executeCommands();
  canvas.printGrid();
}
```
