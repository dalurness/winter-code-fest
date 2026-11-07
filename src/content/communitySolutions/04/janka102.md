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
	"unicode/utf8"
)

func render(filePath string) (out string, err error) {
	file, err := os.Open(filePath)
	if err != nil {
		return
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)

	x, y := 0, 0
	canvas := make([][]rune, 0)

	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if len(line) < 2 {
			err = fmt.Errorf("Invalid command: %q", line)
			return
		}

		command := line[0]
		value := line[1:]

		if command == 'L' && value == "R" {
			x, y = 0, 0
			continue
		}

		if command == 'P' {
			r, size := utf8.DecodeRuneInString(value)
			if size != len(value) {
				err = fmt.Errorf("Invalid print command: %q", line)
				return
			}

			if y >= len(canvas) {
				for range y - len(canvas) + 1 {
					canvas = append(canvas, make([]rune, 0))
				}
			}
			row := canvas[y]

			if x >= len(row) {
				for range x - len(row) + 1 {
					row = append(row, ' ')
				}
				canvas[y] = row
			}

			row[x] = r
			continue
		}

		amount, atoiErr := strconv.Atoi(value)
		if atoiErr != nil {
			err = fmt.Errorf("Invalid command: %q", line)
			return
		}

		switch command {
		case 'U':
			y -= amount
		case 'D':
			y += amount
		case 'L':
			x -= amount
		case 'R':
			x += amount
		default:
			err = fmt.Errorf("Invalid command: %q", line)
			return
		}
	}

	if err = scanner.Err(); err != nil {
		return
	}

	var outBuilder strings.Builder
	for _, row := range canvas {
		outBuilder.WriteString(string(row))
		outBuilder.WriteByte('\n')
	}

	return outBuilder.String(), nil
}

func main() {
	fileNames := []string{"0.txt", "1.txt", "2.txt", "3.txt", "4.txt", "5.txt"}
	for _, name := range fileNames {
		fmt.Printf("%s:\n", name)
		picture, err := render("/workspace/days/04/" + name)
		if err != nil {
			log.Fatalln(err)
		}
		fmt.Println(picture)
	}
}
```

## 2025

<details>
<summary>Show Ruby Solution</summary>

```ruby
require 'optparse'

class Day05
  def initialize(filename)
    @filename = filename
  end

  def solve
    canvas = []
    x = 0
    y = 0

    File.open(@filename).each_line do |cmd|
      case cmd.strip
      when /^LR$/
        x = 0
        y = 0
      when /^D(\d+)$/ then y += ::Regexp.last_match(1).to_i
      when /^U(\d+)$/ then y -= ::Regexp.last_match(1).to_i
      when /^R(\d+)$/ then x += ::Regexp.last_match(1).to_i
      when /^L(\d+)$/ then x -= ::Regexp.last_match(1).to_i
      when /^P(.)$/
        raise "Negative position for #{cmd}: x=#{x}, y=#{y}" if x.negative? || y.negative?

        # expand canvas vertically if needed with empty arrays
        canvas.fill(canvas.size..y) { [] } unless canvas.size > y
        row = canvas[y]
        # expand row horizontally if needed with spaces
        row.fill(' ', row.size..x) unless row.size > x

        # add the letter to the canvas
        row[x] = ::Regexp.last_match(1)
      else
        raise "invalid command: #{cmd}"
      end
    end.close

    canvas.each do |row|
      puts row.join('')
    end
  end
end

# Expects the input files to be named 05_[0-5].txt and in the current working directory
if __FILE__ == $PROGRAM_NAME
  options = {}
  OptionParser.new do |parser|
    parser.banner = "Usage: #{$PROGRAM_NAME} [options]"

    parser.on('-[0-5]', 'Solve with different input. Default 0') do |value|
      options[:input] = value
    end
  end.parse!

  challenge = Day05.new("05_#{options[:input] || '0'}.txt")
  challenge.solve
end

```

</details>
