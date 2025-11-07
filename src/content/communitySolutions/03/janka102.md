---
descriptions: ["ruby"]
---

## 2025

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
			break if
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
