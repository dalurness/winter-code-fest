---
descriptions: ["ruby", "go"]
---

## 2026

```go
package main

import (
	"bufio"
	"fmt"
	"log"
	"os"
	"strconv"
	"strings"
)

func main() {
	file, err := os.Open("/workspace/days/10/trees.txt")
	if err != nil {
		log.Fatalf("%v", err)
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)

	outOfBalance := 0
	var trunk, left, right int

	state := "trunk"

	for scanner.Scan() {
		line := strings.Split(scanner.Text(), " ")

		switch state {
		case "trunk":
			if len(line) != 1 {
				log.Fatalln("trunk not equal to 1")
			}
			trunk, err = strconv.Atoi(line[0])
			if err != nil {
				log.Fatalln("Invalid trunk weight")
			}
			state = "branch"
		case "branch":
			if len(line) != 2 {
				log.Fatalln("branches not equal to 2")
			}

			left, err = strconv.Atoi(line[0])
			if err != nil {
				log.Fatalln("Invalid left branch weight")
			}
			right, err = strconv.Atoi(line[1])
			if err != nil {
				log.Fatalln("Invalid right branch weight")
			}
			state = "ornament"
		case "ornament":
			if len(line) != 4 {
				log.Fatalln("ornaments not equal to 4")
			}
			for i, o := range line {
				if o == "_" {
					continue
				}
				w, err := strconv.Atoi(o)
				if err != nil {
					log.Fatalln("Invalid ornament weight")
				}
				if i < 2 {
					left += w
				} else {
					right += w
				}
			}

			if abs(left-right) > 1 {
				outOfBalance += trunk + left + right
			}

			// fmt.Printf("%v, %v, %v, %v\n", trunk, branches, ornaments, []int{left, right})
			state = "next"
		case "next":
			if len(line) != 1 || len(line[0]) > 0 {
				log.Fatalln("No empty line")
			}
			state = "trunk"
		}
	}

	if err = scanner.Err(); err != nil {
		log.Fatalf("%v", err)
	}

	fmt.Printf("Out of balance trees: %d\n", outOfBalance)
}

func abs(a int) int {
	if a < 0 {
		return -a
	}

	return a
}
```

## 2025

```ruby
class Day06
  def initialize(filename)
    @filename = filename
  end

  def solve
    off_balance_trees = 0

    File.open(@filename).each("\r\n\r\n") do |tree|
      trunk = 0
      left = 0
      right = 0

      tree.strip.each_line.with_index do |line, i|
        if i.zero?
          # first line is trunk
          trunk = line.to_i
        elsif i == 1
          # second line is left and right branch weight
          l, r = line.split(' ')
          left = l.to_i
          right = r.to_i
        elsif i == 2
          # third line is 2 left and 2 right ornament weights
          line.each_line(' ').with_index do |weight, i|
            if i < 2
              left += weight.to_i
            elsif i < 4
              right += weight.to_i
            end
          end
        end
      end

      off_balance_trees += trunk + left + right if (left - right).abs > 1
    end.close

    puts "Off balance tree weight: #{off_balance_trees}"
  end
end

# Expects the input file to be named 06.txt and in the current working directory
if __FILE__ == $PROGRAM_NAME
  challenge = Day06.new('06.txt')
  challenge.solve
end
```
