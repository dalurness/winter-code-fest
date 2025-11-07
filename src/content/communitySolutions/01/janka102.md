---
descriptions: ["linux-x86-assembly", "gleam", "ruby"]
---

## 2025

Used Ruby this year. [RuboCop](https://rubocop.org/) is pretty nifty, it transformed a few of my `if` statements into `unless`s.

Initial setup in VSCode took a bit to get working, and I still don't have type help which I was expecting. It shows info for stdlib stuff, but not any of my own classes or variables.

```ruby
require 'optparse'

class Day01
  def initialize(filename)
    @filename = filename
  end

  def solve(verbose)
    total = 0
    counts = []

    File.open(@filename).each(' ').with_index do |code, i|
      country = code.to_i

      counts.fill(0, counts.size..country) unless counts.size > country
      counts[country] += 1

      next unless verbose

      total = i + 1
      $stderr.write "\rprocessed: #{total}" if (total % 10_000).zero?
    end.close

    warn "\rprocessed: #{total}" if verbose

    counts.each.with_index do |count, i|
      puts "#{i}: #{count}" unless count.zero?
    end
  end
end

# Expects the input files to be named 01.txt and 01_challenge.txt and in the current working directory
if __FILE__ == $PROGRAM_NAME
  options = {}
  OptionParser.new do |parser|
    parser.banner = "Usage: #{$PROGRAM_NAME} [options]"

    parser.on('-c', '--challenge', 'Solve with the challenge input') do
      options[:challenge] = true
    end

    parser.on('-v', '--verbose', 'Enable verbose logging') do
      options[:verbose] = true
    end
  end.parse!

  challenge = Day01.new("01#{options[:challenge] ? '_challenge' : ''}.txt")
  challenge.solve options[:verbose]
end
```

## 2024

<details>
<summary>Show Gleam Solution</summary>

First time using Gleam. I think there's room for improvement in my solution, but it's a start. I also see the similarity to elixir, but it's cool they have compile-to-js.

I didn't get file reading working at this time, so just copy/paste the contents of the file into the string.

```gleam
import gleam/io
import gleam/string
import gleam/dict
import gleam/list
import gleam/option.{Some, None}
import gleam/result
import gleam/pair
import gleam/int

pub fn main() {
  // Copy/paste the contents of the file into the string here
  let letters = "..."
  let increment = fn(x) {
    case x {
      Some(i) -> i + 1
      None -> 1
    }
  }

  string.split(letters, on: " ")
  |> list.map(fn(code) { result.unwrap(int.parse(code), or: -1) })
  |> list.fold(dict.new(), fn(acc, code) { dict.upsert(acc, code, increment) })
  |> dict.to_list()
  |> list.sort(by: fn(e1, e2) { int.compare(pair.first(e1), pair.first(e2)) })
  |> list.map(fn(e) { int.to_string(pair.first(e)) <> ": " <> int.to_string(pair.second(e)) })
  |> string.join(with: "\n")
  |> io.print()
}
```

One question I had while writing it: Why do I need to import `Some` and `None`? Loose experimenting shows I don't need to do that with `Ok` and `Error`.

</details>

## 2023

<details>
<summary>Show Assembly Solution</summary>

First solution in assembly. Linux only, sorry Windows users. It's not perfect, and I cheat a little bit by not formatting the output, but it works well enough.

To compile and run, use the following:

```sh
gcc day01.s -no-pie -o day01 && ./day01 | od -t u1
```

Note: Make sure you have the letters input named "input.txt" in the current directory.

```asm
.text
.global main
main:
	# open file
	movl  $5, %eax
	movl  $path, %ebx
	movl  $0, %ecx
	int   $0x80

	# read entire file
	movl  %eax, %ebx
	movl  $3, %eax
	movl  $buff, %ecx
	movl  $16384, %edx
	int   $0x80
	movl  %eax, len
	movl  $0, pos

main_loop:
	call  atoi

	# check if less than 0, meaning end of file
	cmp   $0, %eax
	jl    end_loop

	# increment the value at the country code position in the array
	movl  country_counts(, %eax, 1), %ebx
	inc   %ebx
	movl  %ebx, country_counts(, %eax, 1)
	jmp   main_loop

end_loop:
	# write
	movl  $4, %eax
	movl  $1, %ebx
	leal  country_counts(, %ebx, 1), %ecx
	movl  $196, %edx
	int   $0x80

exit:
	# exit
	movl  $1, %eax
	movl  $0, %ebx
	int   $0x80


# not really a good general purpose atoi, but it works here
.global atoi
atoi:
	movl  $0, %eax # eax will be the resulting integer

atoi_loop:
	# check if at end of string
	movl  len, %ebx
	movl  pos, %ecx
	cmpl  %ebx, %ecx
	jge   atoi_end_pre

	# read a char from the buffer and increment the read position
	movl  $0, %ebx
	mov   buff(, %ecx, 1), %bl
	inc   %ecx
	movl  %ecx, pos

	# check if at a space
	cmp   $0x30, %bl
	jl    atoi_end

	# actual conversion here.
	# multiply previous result by 10 and add current
	sub   $0x30, %bl
	movl  $10, %ecx
	mul   %ecx
	addl  %ebx, %eax
	jmp   atoi_loop

atoi_end_pre:
	movl $-1, %eax
atoi_end:
	ret


.lcomm buff, 16384 # buffer for reading the file
.lcomm country_counts, 200 # array for accumulating the letter counts, 1 byte per country
.lcomm len, 4 # total length of the file
.lcomm pos, 4 # current position in the file

.data
path:
	.string "./input.txt"
```

</details>
