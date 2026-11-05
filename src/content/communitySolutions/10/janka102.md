---
descriptions: ["ruby"]
---

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
