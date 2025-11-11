---
descriptions: ["ruby"]
---

## 2025

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
