---
descriptions: ["ruby"]
---

## 2025

```ruby
require 'optparse'

class Day09
  def initialize(filename)
    @filename = filename

    wordlist_file = File.open('09_wordlist.txt')
    # they could be either capitalized like in the wordlist file already or all lowercase
    @wordlist = wordlist_file.readlines(chomp: true).flat_map { |word| [word, word.downcase] }
    wordlist_file.close
  end

  def solve
    message_file = File.open(@filename)
    message = message_file.readlines(chomp: true)
    message_file.close

    homac = message[0].to_i
    ciphertext = message[1].split(',').map(&:to_i)

    key = find_key(homac, ciphertext)

    puts "Found key: #{key}"
    puts
    cipher = HoHoHo4.new(key)
    plaintext = cipher.cipher(ciphertext).pack('c*')
    puts plaintext
  end

  def find_key(homac, ciphertext)
    @wordlist.each do |word|
      # The key has to be exactly 8 characters long since it is part of the internal state of the cipher
      next if word.size != 8

      cipher = HoHoHo4.new(word)
      return word if homac == cipher.HoMAC(ciphertext)
    end

    # words are at least 3 characters so we can only fit at most 2 words in a key
    @wordlist.repeated_permutation(2) do |(a, b)|
      word = a + b

      # The key has to be exactly 8 characters long since it is part of the internal state of the cipher
      next if word.size != 8

      cipher = HoHoHo4.new(word)
      return word if homac == cipher.HoMAC(ciphertext)
    end

    throw :key_not_found
  end
end

class HoHoHo4
  @@constant = 'Ho Ho Ho'.bytes

  def initialize(key)
    raise ArgumentError, 'Key must be exactly 8 bytes long' if key.size != 8

    @key = key.bytes
  end

  # Same operation is used for decrypt and encrypt, so I named it something generic for both
  def cipher(message)
    # 1. The output buffer is the same size as the input buffer
    # 2. Reset the internal state
    @state = @@constant + @key
    size = @state.size

    # 3. Chunk the input into 16 byte blocks (the same size as the internal state)
    message.each_with_index.chunk do |_byte, i|
      (i / size).floor
    end.flat_map do |_i, chunk|
      # 3.1. Do 4 mix operations, this is HoHoHo4 after all
      4.times { mix }

      # 3.2. For each byte in the internal state XOR it with the next input byte and save that in the output buffer.
      # 4. There is no padding on the input, so at any time if you run out of input, stop
      chunk.map do |byte, i|
        @state[i % size] ^ byte
      end
    end
  end

  def mix
    # 1. stir the values at positions 0, 4, 8, 12
    # 2. stir the values at positions 1, 5, 9, 13
    # 3. stir the values at positions 2, 6, 10, 14
    # 4. stir the values at positions 3, 7, 11, 15
    (0..3).each do |i|
      stir(i, i + 4, i + 8, i + 12)
    end
  end

  def stir(a, b, c, d)
    # 1. Increment the value at A by the XOR of values at D and C
    @state[a] = (@state[a] + (@state[d] ^ @state[c])) & 0xFF

    # 2. Increment the value at B by the XOR of values at A and D
    @state[b] = (@state[b] + (@state[a] ^ @state[d])) & 0xFF

    # 3. Increment the value at C by the XOR of values at B and A
    @state[c] = (@state[c] + (@state[b] ^ @state[a])) & 0xFF

    # 4. Increment the value at D by the XOR of values at C and B
    @state[d] = (@state[d] + (@state[c] ^ @state[b])) & 0xFF
  end

  def HoMAC(message)
    # 1. Concatenate the ciper key and the message (in that order)
    # 2. Run the HoHash function on that
    inner = HoHash(@key + message)
    inner_bytes = [inner].pack('L')

    # 3. Concatenate the cipher key again and with the previous HoHash result (4 bytes)
    # 4. Run the HoHash function on that
    # 5. This results in the HoMAC output which is another 32 bit number
    HoHash(@key + inner_bytes.bytes)
  end

  def HoHash(message)
    # 1. Set a prime number equal to 31
    prime = 31

    # 2. Set the hash output equal to 0
    message.reduce(0) do |hash, byte|
      # 3. For every byte of the input do the following:
      # 3.1. Multiply the last hash output by the prime number then add the current byte value
      # 3.2. Modulo all that by 2^32
      # 3.3. Set that as the new hash output
      (hash * prime + byte) & 0xFFFFFFFF
    end
    # 4. You will end up with a single 32 bit number as the hash value
  end
end

# Expects the secret files to be named 09_[0-6].txt and 09_wordlist.txt and in the current working directory
if __FILE__ == $PROGRAM_NAME
  options = {}
  OptionParser.new do |parser|
    parser.banner = "Usage: #{$PROGRAM_NAME} [options]"

    parser.on('-[0-6]', 'Decrypt a different message. Default 0') do |value|
      options[:input] = value
    end
  end.parse!

  challenge = Day09.new("09_#{options[:input] || '0'}.txt")
  challenge.solve
end
```
