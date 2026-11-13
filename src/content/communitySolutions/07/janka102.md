---
descriptions: ["ruby", "go"]
---

## 2026

```go
package main

import (
	"bufio"
	"container/heap"
	"fmt"
	"log"
	"os"
	"slices"
	"strings"
	"time"
)

type Location struct {
	X, Y int
}

func (l Location) Move(d Direction) Location { return Location{l.X + d.Dx, l.Y + d.Dy} }

func (l Location) Towards(o Location) Direction { return Direction{l.X - o.X, l.Y - o.Y} }

func (l Location) String() string {
	return fmt.Sprintf("(%d, %d)", l.X, l.Y)
}

type Map struct {
	Height, Width int
	Start, End    *Location
	Tiles         [][]byte
}

func (m *Map) AppendLine(line string) {
	if m.Width != len(line) {
		if m.Width > 0 {
			log.Fatalln("Uneven map rows")
		}

		m.Width = len(line)
	}

	s := strings.Index(line, "S")
	if s >= 0 {
		if m.Start != nil {
			log.Fatalln("Multiple Starts")
		}

		m.Start = &Location{s, m.Height}
	}

	e := strings.Index(line, "E")
	if e >= 0 {
		if m.End != nil {
			log.Fatalln("Multiple Ends")
		}

		m.End = &Location{e, m.Height}
	}

	m.Height++
	m.Tiles = append(m.Tiles, []byte(line))
}

func (m *Map) IsValid(l Location) bool {
	return l.X >= 0 && l.X < m.Width && l.Y >= 0 && l.Y < m.Height && m.Tiles[l.Y][l.X] != 'X'
}

type Direction struct {
	Dx int
	Dy int
}

var (
	None  = Direction{0, 0}
	North = Direction{0, -1}
	East  = Direction{1, 0}
	South = Direction{0, 1}
	West  = Direction{-1, 0}
)

var Directions = []Direction{North, East, South, West}

var dirInfo = map[Direction]struct {
	name   string
	letter rune
	arrow  rune
}{
	None:  {"None", '?', '*'},
	North: {"North", 'N', '🢁'},
	East:  {"East", 'E', '🢂'},
	South: {"South", 'S', '🢃'},
	West:  {"West", 'W', '🢀'},
}

func (d *Direction) String() string { return "{" + dirInfo[*d].name + "}" }

type Segment struct {
	direction Direction
	count     int
}

type Segments []Segment

func (s *Segment) String() string {
	return fmt.Sprintf("%d%c", s.count, dirInfo[s.direction].letter)
}

func (s Segments) String() string {
	var b strings.Builder

	for _, segment := range s {
		b.WriteString(segment.String())
	}

	return b.String()
}

type Path struct {
	full    []Location
	compact Segments
}

type pqItem struct {
	loc  Location
	g, f int
}

// A Priority Queue backed by an array, for A*
type PriorityQueue []pqItem

func (pq PriorityQueue) Len() int           { return len(pq) }
func (pq PriorityQueue) Less(i, j int) bool { return pq[i].f < pq[j].f }
func (pq PriorityQueue) Swap(i, j int)      { pq[i], pq[j] = pq[j], pq[i] }
func (pq *PriorityQueue) Push(x any)        { *pq = append(*pq, x.(pqItem)) }
func (pq *PriorityQueue) Pop() any {
	old := *pq
	item := old[len(old)-1]
	*pq = old[:len(old)-1]
	return item
}

type Solver struct {
	rawMap Map
	visits map[Location]Direction
}

func NewSolver(rawMap Map) Solver {
	return Solver{
		rawMap: rawMap,
		visits: make(map[Location]Direction),
	}
}

func (s *Solver) Path() Path {
	var path []Location
	var segments Segments

	tile := *s.rawMap.End

	for tile != *s.rawMap.Start {
		d, found := s.visits[tile]

		if !found {
			return Path{}
		}

		if len(segments) == 0 || segments[len(segments)-1].direction != d {
			segments = append(segments, Segment{direction: d})
		}

		segments[len(segments)-1].count++

		path = append(path, tile)

		tile.X -= d.Dx
		tile.Y -= d.Dy
	}

	path = append(path, *s.rawMap.Start)

	slices.Reverse(path)
	slices.Reverse(segments)
	return Path{full: path, compact: segments}
}

func (s *Solver) String() string {
	pathMap := make(map[Location]rune)
	path := s.Path().full

	for i, l := range path {
		if i > 0 && i < len(path)-1 {
			pathMap[l] = dirInfo[path[i+1].Towards(l)].arrow
		} else {
			pathMap[l] = rune(s.rawMap.Tiles[l.Y][l.X])
		}
	}

	var b strings.Builder

	for y, row := range s.rawMap.Tiles {
		for x, tile := range row {
			l := Location{x, y}
			if r, found := pathMap[l]; found {
				b.WriteString(fmt.Sprintf("\033[31m%c\033[0m", r))
			} else {
				switch tile {
				case 'O':
					b.WriteRune('░')
				case 'X':
					b.WriteString("\033[7m^\033[m")
				default:
					b.WriteByte(tile)
				}
			}
		}

		if y < len(s.rawMap.Tiles)-1 {
			b.WriteRune('\n')
		}
	}

	return b.String()
}

func (s *Solver) bfs() bool {
	s.visits = make(map[Location]Direction)

	// The queue of map tiles to check
	var frontier []Location

	// Enqueue the start, and mark as visited
	s.visits[*s.rawMap.Start] = None
	frontier = append(frontier, *s.rawMap.Start)

	for len(frontier) > 0 {
		// Dequeue tile
		current := frontier[0]
		frontier = frontier[1:]

		// Once we see the end then we're done
		if current == *s.rawMap.End {
			return true
		}

		// Enqueue and mark as visited all valid neighbors
		for _, d := range Directions {
			neighbor := current.Move(d)

			if _, seen := s.visits[neighbor]; !s.rawMap.IsValid(neighbor) || seen {
				continue
			}

			s.visits[neighbor] = d
			frontier = append(frontier, neighbor)
		}
	}

	return false
}

func (s *Solver) astar() bool {
	s.visits = make(map[Location]Direction)
	start, end := *s.rawMap.Start, *s.rawMap.End

	abs := func(x int) int {
		if x < 0 {
			return -x
		}
		return x
	}

	// heuristic function that estimates distance to end from any location
	h := func(l Location) int { return abs(end.X-l.X) + abs(end.Y-l.Y) }

	openSet := &PriorityQueue{{loc: start, g: 0, f: h(start)}}
	gScore := map[Location]int{start: 0}

	for openSet.Len() > 0 {
		current := heap.Pop(openSet).(pqItem)

		if current.g > gScore[current.loc] {
			continue
		}

		if current.loc == end {
			return true
		}

		for _, d := range Directions {
			neighbor := current.loc.Move(d)

			if !s.rawMap.IsValid(neighbor) {
				continue
			}

			tentativeGScore := current.g + 1
			if score, found := gScore[neighbor]; !found || tentativeGScore < score {
				s.visits[neighbor] = d
				gScore[neighbor] = tentativeGScore
				heap.Push(openSet, pqItem{loc: neighbor, g: tentativeGScore, f: tentativeGScore + h(neighbor)})
			}
		}
	}

	return false
}

func main() {
	file, err := os.Open("/workspace/days/07/map-big.txt")
	if err != nil {
		log.Fatalf("%w", err)
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)

	var rawMap Map

	for scanner.Scan() {
		line := scanner.Text()

		rawMap.AppendLine(line)
	}

	if err := scanner.Err(); err != nil {
		log.Fatalf("%w", err)
	}

	solver := NewSolver(rawMap)

	fmt.Println("Depth-first")
	start := time.Now()
	if !solver.bfs() {
		log.Fatalln("No solution found!")
	}
	took := time.Since(start)
	fmt.Println(solver.String())

	path := solver.Path()
	fmt.Printf("Took %s\n", took)
	fmt.Printf("Length: %d\n%s\n\n", len(path.full), path.compact)

	fmt.Println("A*")
	start = time.Now()
	if !solver.astar() {
		log.Fatalln("No solution found!")
	}
	took = time.Since(start)
	fmt.Println(solver.String())

	path = solver.Path()
	fmt.Printf("Took %s\n", took)
	fmt.Printf("Length: %d\n%s\n\n", len(path.full), path.compact)
}
```

## 2025

<details>
<summary>Show Ruby Solution</summary>

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

</details>
