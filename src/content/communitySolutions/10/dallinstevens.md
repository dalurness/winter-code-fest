---
descriptions: ["deno"]
---

### 2025 Solution Deno

### Output

```
Off Balance Weight: 580
```

```ts
class Tree {
  private trunkWeight: number;
  private LeftWeight: number;
  private RightWeight: number;

  constructor(treeSpec: string) {
    const treeParts = treeSpec.split("\n");
    this.trunkWeight = Number(treeParts[0]);

    const branches = treeParts[1].split(" ");
    const ornaments = treeParts[2].split(" ");

    for (let i = 0; i < ornaments.length; i++) {
      if (ornaments[i] == "_") {
        ornaments[i] = "0";
      }
    }

    this.LeftWeight =
      Number(branches[0]) + Number(ornaments[0]) + Number(ornaments[1]);
    this.RightWeight =
      Number(branches[1]) + Number(ornaments[2]) + Number(ornaments[3]);
  }

  public isBalanced(): boolean {
    return this.LeftWeight - this.RightWeight > 1 ||
      this.RightWeight - this.LeftWeight > 1
      ? false
      : true;
  }
  public getWeight(): number {
    return this.trunkWeight + this.LeftWeight + this.RightWeight;
  }
}

if (import.meta.main) {
  const trees = (await Deno.readTextFile("trees.txt")).split("\n\n");
  let weightCounter = 0;

  for (let i = 0; i < trees.length; i++) {
    const tree = new Tree(trees[i]);
    if (!tree.isBalanced()) {
      weightCounter += tree.getWeight();
    }
  }

  console.log(weightCounter);
}
```
