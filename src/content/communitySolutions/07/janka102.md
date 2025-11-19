---
descriptions: ["ruby"]
---

## 2025

One interesting thing I learned about Ruby is that the Hash class uses value equality for keys via `.hash` and `.eql?`. So for example two arrays with the same numbers in them can be used to check for the presense of the other (as apposed to only that _exact_ array). This was useful for me since I was using arrays for [x, y] coordinates and could then store those directly in the visits hash map.

```ruby
require 'optparse'

class Day07
  def initialize(filename)
    @filename = filename
  end

  def solve(verbose)
    map_file = File.open(@filename)
    @map = map_file.readlines(chomp: true)
    map_file.close

    y = @map.find_index { |line| line.include?('S') }
    x = @map[y].index('S')
    @start = [x, y]

    y = @map.find_index { |line| line.include?('E') }
    x = @map[y].index('E')
    @end = [x, y]

    path = breadth_first_search(verbose)

    short_path = ''
    dir = nil
    count = 0

    # compress the path so that for example EEENEEES => 3E1N3E1S
    path.each_char do |d|
      if dir == d
        count += 1
      else
        short_path += "#{count}#{dir}" unless dir.nil?
        dir = d
        count = 1
      end
    end
    short_path += "#{count}#{dir}"

    puts short_path
  end

  def breadth_first_search(verbose)
    visits = { @start => '' }
    frontier = [@start]

    until frontier.empty?
      node = frontier.shift

      if @end == node
        path = visits[node]
        return path
      end

      # explore the 4 cardinal directions around this point
      'NESW'.each_char do |dir|
        dx, dy = case dir
                 when 'N' then [0, -1]
                 when 'E' then [1, 0]
                 when 'S' then [0, 1]
                 when 'W' then [-1, 0]
                 end

        nx = node[0] + dx
        ny = node[1] + dy
        next if ny.negative? || ny >= @map.size

        nrow = @map[ny]
        next if nx.negative? || nx >= nrow.size
        next if nrow[nx] == 'X' || visits.include?([nx, ny])

        # save the path to get to this node as the value
        parent = visits[node]
        visits[[nx, ny]] = parent + dir
        frontier.push([nx, ny])
      end

      next unless verbose

      # print out current state of the explored map
      @map.each_with_index do |line, y|
        line.each_char.each_with_index do |c, x|
          print visits.include?(node) ? '.' : c
        end
        puts
      end
      puts
    end
  end
end

# Expects the input file to be named 07.txt and in the current working directory
if __FILE__ == $PROGRAM_NAME
  options = {}
  OptionParser.new do |parser|
    parser.banner = "Usage: #{$PROGRAM_NAME} [options]"

    parser.on('-v', '--verbose', 'Enable verbose logging')
  end.parse!(into: options)

  challenge = Day07.new('07.txt')
  challenge.solve options[:verbose]
end
```
