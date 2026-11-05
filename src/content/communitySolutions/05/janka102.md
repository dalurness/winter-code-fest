---
descriptions: ["ruby"]
---

## 2025

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
