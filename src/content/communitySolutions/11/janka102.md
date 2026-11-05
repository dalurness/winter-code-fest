---
descriptions: ["ruby"]
---

## 2025

```ruby
class Day04
  def initialize(filename)
    @filename = filename
  end

  def solve
    total_time = 0

    # Snap, Crackle, Pop, and Steve, one of the better looking elves
    elves_multiplyer = [1.4, 0.7, 1.1, 1]
    working_elves = [0, 0, 0, 0] # how long each elf is still working on a present

    File.open(@filename).each(' ') do |present|
      time = present.to_i
      next_elf = working_elves.find_index(0) # find first non-working elf

      # if they are all working then advance time by the minimum time left for an elf to finish
      if next_elf.nil?
        min_time_left = working_elves.min
        total_time += min_time_left
        working_elves = working_elves.map { |t| t - min_time_left }
        next_elf = working_elves.find_index(0)
      end

      # get that elf workin
      time_needed = (time / elves_multiplyer[next_elf]).ceil + 1
      working_elves[next_elf] = time_needed
    end.close

    max_time_left = working_elves.max
    total_time += max_time_left

    puts "Total Time: #{total_time} minutes"
  end
end

# Expects the input file to be named 04.txt and in the current working directory
if __FILE__ == $PROGRAM_NAME
  challenge = Day04.new('04.txt')
  challenge.solve
end
```
