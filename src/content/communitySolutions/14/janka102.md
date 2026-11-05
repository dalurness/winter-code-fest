---
descriptions: ["ruby"]
---

## 2025

```ruby
class Day10
  def initialize(filename)
    @filename = filename
  end

  def solve
    file = File.open(@filename)
    data = file.readline(chomp: true)
    file.close

    presents = data.split(' ').map(&:to_i).sort

    median = presents.size.odd? ? presents[(presents.size / 2)] : presents[(presents.size / 2) - 1, 2].sum / 2.0
    first_median_last = [presents.first, median, presents.last]

    missing = []
    last = nil
    presents.each do |present|
      missing.push(*((last + 1)..(present - 1))) if !last.nil? && present > last + 1
      last = present
    end

    print "#{first_median_last}\n"
    print "#{missing}\n"
  end
end

# Expects the input file to be named 10.txt and in the current working directory
if __FILE__ == $PROGRAM_NAME
  challenge = Day10.new('10.txt')
  challenge.solve
end
```
