name = ARGV[0] || "Winter Code Fest"

lines = (1..3).map { |i| "#{i}: Hello, #{name}!" }
puts lines
puts "Ruby #{RUBY_VERSION}"
