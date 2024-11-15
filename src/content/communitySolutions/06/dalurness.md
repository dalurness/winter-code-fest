---
descriptions: ["go"]
---
```go
package main

import (
    "fmt"
    "os"
    "strconv"
    "strings"
)

func absDiffInt(x, y int) int {
    if x < y {
        return y - x
    }
    return x - y
}

func main() {
    dat, err := os.ReadFile("../trees.txt")
    if err != nil {
        panic("failed to read file")
    }

    trees := strings.Split(string(dat[:]), "\n\n")

    totalOffBalanceWeight := 0
    for _, tree := range trees {
        parts := strings.Split(tree, "\n")
        trunkWeight, err := strconv.Atoi(parts[0])
        if err != nil {
            panic("trunc value incorrect")
        }

        leftWeight := 0
        rightWeight := 0
        limbsStrings := strings.Split(parts[1], " ")
        leftLimb, err := strconv.Atoi(limbsStrings[0])
        if err != nil {
            panic("failed converting left limb amount")
        }
        leftWeight = leftWeight + leftLimb
        rightLimb, err := strconv.Atoi(limbsStrings[1])
        if err != nil {
            panic("failed to convert right limb")
        }
        rightWeight = rightWeight + rightLimb

        ornamentsStrings := strings.Split(parts[2], " ")
        lOrn1, err := strconv.Atoi(ornamentsStrings[0])
        if err == nil {
            leftWeight = leftWeight + lOrn1
        }
        lOrn2, err := strconv.Atoi(ornamentsStrings[1])
        if err == nil {
            leftWeight = leftWeight + lOrn2
        }
        rOrn1, err := strconv.Atoi(ornamentsStrings[2])
        if err == nil {
            rightWeight = rightWeight + rOrn1
        }
        rOrn2, err := strconv.Atoi(ornamentsStrings[3])
        if err == nil {
            rightWeight = rightWeight + rOrn2
        }
        if absDiffInt(leftWeight, rightWeight) > 1 {
            totalOffBalanceWeight = totalOffBalanceWeight + leftWeight + rightWeight + trunkWeight
            fmt.Printf("Tree weight: %d\n", leftWeight+rightWeight+trunkWeight)
        }
    }

    fmt.Printf("Total: %d\n", totalOffBalanceWeight)
}
```
