---
descriptions: ["ruby", "go"]
---

## 2026

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
