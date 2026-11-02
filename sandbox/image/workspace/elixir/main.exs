name = List.first(System.argv(), "Winter Code Fest")

text =
  1..3
  |> Enum.map(fn i -> "#{i}: Hello, #{name}!" end)
  |> Enum.join("\n")

IO.puts(text)
IO.puts("Elixir #{System.version()} on OTP #{System.otp_release()}")
