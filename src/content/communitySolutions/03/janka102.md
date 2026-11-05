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
)

func main() {
	file, err := os.Open("/workspace/days/03/assembly_codes.txt")
	defer file.Close()
	if err != nil {
		log.Fatalln(err)
	}

	scanner := bufio.NewScanner(bufio.NewReader(file))

	valid, added, removed := 0, 0, 0
	for scanner.Scan() {
		line := scanner.Text()
		invalid := false

		// Must end with "CP"
		if line[len(line)-2:] != "CP" {
			invalid = true
		}

		// Last two chars don't matter anymore after checking above
		for _, c := range line[:len(line)-2] {
			// Both A and C are added, but C makes it invalid
			// Both R and P are removed, but P makes it invalid
			switch c {
			case 'C':
				invalid = true
				fallthrough
			case 'A':
				added++
			case 'P':
				invalid = true
				fallthrough
			case 'R':
				removed++
			}
		}

		if !invalid {
			valid++
		}
	}

	if err := scanner.Err(); err != nil {
		log.Fatalf("Invalid input: %s\n", err)
	}

	fmt.Printf("Valid: %d\n", valid)
	fmt.Printf("Added: %d, Removed: %d\n", added, removed)
}
```

## 2025

<details>
<summary>Show Ruby Solution</summary>

Ok maybe RuboCop is a little weird, it changes `if c == 'A' || c == 'C'` to `if %w[A C].include?(c)` and `self.part1` to `part1`.

Sure those are more compact, but to my eyes it's a little _too_ compact. I tend to like more explicit code. These are also just the default settings for RuboCop, I have no idea how many people actually use the defaults or not.

```ruby
require 'optparse'

class Day03
  def initialize(filename)
    @filename = filename
  end

  def solve(options)
    if !options[:challenge]
      part1
    else
      part2
    end
  end

  def part1
    valid = 0

    File.open(@filename).each_line do |code|
      parts = 0
      checked = false

      code = code.rstrip
      code.each_char.with_index do |c, i|
        case c
        when 'A'
          parts += 1
        when 'R'
          break if parts.zero?

          parts -= 1
        when 'C'
          break if i != (code.size - 2)

          checked = true
        when 'P'
          valid += 1 if checked && i == (code.size - 1)
          break
        end
      end
    end.close

    puts "Valid: #{valid}"
  end

  def part2
    added = 0
    removed = 0

    File.open(@filename).each_line do |code|
      code = code.rstrip
      code.each_char.with_index do |c, i|
        if %w[A C].include?(c)
          added += 1
        elsif %w[R P].include?(c)
          removed += 1
        end

        break if i >= (code.size - 3)
      end
    end.close

    puts "Added #{added}, Removed #{removed}"
  end
end

# Expects the input file to be named 03.txt and in the current working directory
if __FILE__ == $PROGRAM_NAME
  options = {}
  OptionParser.new do |parser|
    parser.banner = "Usage: #{$PROGRAM_NAME} [options]"

    parser.on('-c', '--challenge', 'Solve with the challenge input') do
      options[:challenge] = true
    end
  end.parse!

  challenge = Day03.new('03.txt')
  challenge.solve options
end
```

</details>
