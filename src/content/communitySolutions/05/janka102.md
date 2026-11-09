---
descriptions: ["ruby", "go"]
---

## 2026

### Recursive

```go
package main

import (
	"fmt"
	"math/big"
	"time"
)

type Sleigh struct {
	minPresent uint
	maxPresent uint
	memo       map[[2]uint]*big.Int
}

func NewSleigh() Sleigh {
	return Sleigh{
		minPresent: 1,
		maxPresent: 9,
		memo:       make(map[[2]uint]*big.Int),
	}
}

func (s *Sleigh) Fill(prev, size uint) *big.Int {
	if size < 1 {
		return big.NewInt(0)
	}

	// If we have previously calculated this configuration already then use that
	if c, ok := s.Query(prev, size); ok {
		return c
	}

	count := big.NewInt(0)
	for i := s.minPresent; i <= s.maxPresent && i <= size; i++ {
		// Disallow two of the same size next to each other
		if i == prev {
			continue
		}

		// Only if we can fill the space completely do we count it
		if i == size {
			count.Add(count, big.NewInt(1))
		} else {
			// Otherwise place the present and count how many fit in the remaining space
			count.Add(count, s.Fill(i, size-i))
		}
	}

	// Save this result for future recall
	s.memo[[2]uint{prev, size}] = count

	return count
}

func (s *Sleigh) Query(prev, size uint) (*big.Int, bool) {
	count, ok := s.memo[[2]uint{prev, size}]
	return count, ok
}

func main() {
	size := uint(1)
	sleigh := NewSleigh()
	var duration time.Duration
	start := time.Now()

	// See how far it can get in 1 Second
	for {
		sleigh.Fill(0, size)
		end := time.Since(start)

		if end <= time.Second {
			duration = end
			size++
		} else {
			break
		}
	}

	// Print the first 30 to check challenge solutions
	for s := uint(1); s <= 30; s++ {
		if count, ok := sleigh.Query(0, s); ok {
			fmt.Printf("%d: %s\n", s, count.String())
		} else {
			fmt.Printf("%d: Not found\n", s)
		}
	}

	// Print hightest one found
	if count, ok := sleigh.Query(0, size-1); ok {
		fmt.Printf("%d: %s\n", size-1, count.String())
	} else {
		fmt.Printf("Not found: %d\n", size-1)
	}

	fmt.Printf("Took %s\n", duration)
}
```

### Iterative

```go
package main

import (
	"fmt"
	"math/big"
	"strings"
)

type Sleigh struct {
	maxPresent int
	size       int
	presents   []int
	memo       map[[2]int]*big.Int
}

func NewSleigh(size int) Sleigh {
	return Sleigh{
		maxPresent: 9,
		size:       size,
		presents:   make([]int, 0),
		memo:       make(map[[2]int]*big.Int),
	}
}

func (s *Sleigh) String() string {
	var b strings.Builder

	b.WriteString(fmt.Sprintf("%d:", s.size))

	// b.WriteRune('[')
	// for _, p := range s.presents {
	// 	for range p {
	// 		b.WriteRune(rune('0' + p))
	// 	}
	// }
	// b.WriteString(strings.Repeat(" ", s.size-s.Filled()))
	// b.WriteRune(']')

	b.WriteString(fmt.Sprintf(" %s", s.Count().String()))

	return b.String()
}

func (s *Sleigh) Last() int {
	if len(s.presents) > 0 {
		return s.presents[len(s.presents)-1]
	}

	return 0
}

func (s *Sleigh) Filled() int {
	var sum int
	for _, item := range s.presents {
		sum += item
	}
	return sum
}

func (s *Sleigh) Count() *big.Int {
	return s.memo[[2]int{0, s.size}]
}

func (s *Sleigh) Inc() bool {
	last := s.Last()
	filled := s.Filled()
	empty := s.size - filled

	if count, ok := s.memo[[2]int{last, empty}]; ok {
		s.bump(count)
	} else {
		insert := 1
		if s.Last() == 1 {
			insert = 2
		}

		if filled+insert <= s.size {
			s.memo[[2]int{last, empty}] = big.NewInt(0)

			s.presents = append(s.presents, insert)

			if filled+insert == s.size {
				s.bump(big.NewInt(1))
			}
			return true
		}
	}

	return s.roll()
}

// / Bump counters
func (s *Sleigh) bump(count *big.Int) {
	size := s.size
	s.memo[[2]int{0, size}] = s.memo[[2]int{0, size}].Add(s.memo[[2]int{0, size}], count)
	for _, p := range s.presents[:len(s.presents)-1] {
		size -= p
		s.memo[[2]int{p, size}] = s.memo[[2]int{p, size}].Add(s.memo[[2]int{p, size}], count)
	}
}

// / Increment the rightmost present size, carrying if needed
func (s *Sleigh) roll() bool {
	firstMax := s.maxPresent
	if s.size < s.maxPresent {
		firstMax = s.size
	}

	for i := len(s.presents) - 1; i >= 0; i-- {
		if i == 0 && s.presents[0] == firstMax {
			return false
		}

		filled := s.Filled()
		inc := 1
		if i > 0 && s.presents[i-1] == s.presents[i]+1 {
			inc = 2
		}
		if s.presents[i]+inc <= s.maxPresent && filled+inc <= s.size {
			s.presents[i] += inc
			if filled+inc == s.size {
				s.bump(big.NewInt(1))
			}
			break
		}

		s.presents = s.presents[:len(s.presents)-1]
	}

	return true
}

func main() {
	for s := range 30 {
		sleigh := NewSleigh(s + 1)
		// fmt.Println(sleigh.String())

		for sleigh.Inc() {
			// fmt.Println(sleigh.String())
		}

		fmt.Println(sleigh.String())
	}
}
```

## 2025

<details>
<summary>Show Ruby Solution</summary>

I used a recursive approach filling in smaller and smaller sleigh sizes as presents are added. This gets very slow very quickly with a naive implementation. One trick is of course classic memoization! The trick to that trick is that you need to have a separate entry for each sleigh size _and previous present size_. Since present sizes can't repeat, then for example a remaining sleigh size of 5 can hold different amounts depending on what the previous present was (including no previous present).

```
1: 1
...
10: 123
...
100: 638760883391635670992582
...
1000: 9.849739E+240
...
10000: 7.486669E+2412
________________________________________________________
Executed in    1.01 secs
```

```ruby
require 'optparse'

class Dayd08
  def initialize
    @memo = {}
  end

  def solve(challenge)
    if challenge
      (1..).each do |size|
        arrangements = fill_sleigh(size, nil)
        # the numbers get very large, so format in 3.141592E+65 format
        if size > 100
          digits = Math.log10(arrangements)
          sig_figs = 10**(digits % 1)
          exponent = digits.floor
          puts "#{size}: #{format('%.6fE+%d', sig_figs, exponent)}"
        else
          puts "#{size}: #{arrangements}"
        end
      end
    else
      size = 30
      puts "#{size}: #{fill_sleigh(size, nil)}"
    end
  end

  # Given a sleigh size, try to fit one of each size present
  # then add up how many presents can fit in the new smaller sleigh
  def fill_sleigh(size, prev)
    return @memo[[size, prev]] if @memo.include?([size, prev])

    total = 0

    # order is important, check small to big
    (1..9).each do |present|
      # don't allow two presents of the same size next to each other
      next if present == prev

      remaining = size - present

      # if there is the exact space required for this present then we found a solution
      total += 1 if remaining.zero?

      # if no more space then we can break early and skip checking even bigger presents
      break if remaining <= 0

      sub = fill_sleigh(remaining, present)
      total += sub if sub.positive?
    end

    @memo[[size, prev]] = total

    total
  end
end

if __FILE__ == $PROGRAM_NAME
  options = {}
  OptionParser.new do |parser|
    parser.banner = "Usage: #{$PROGRAM_NAME} [options]"

    parser.on('-c', '--challenge', 'Solve for ever increasing sleigh sizes')
  end.parse!(into: options)

  challenge = Dayd08.new
  challenge.solve(options[:challenge])
end
```

</details>
