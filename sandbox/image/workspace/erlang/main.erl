-module(main).
-export([main/1]).

main(Args) ->
    Name = case Args of
        [First | _] -> First;
        [] -> "Winter Code Fest"
    end,
    [io:format("~b: Hello, ~s!~n", [I, Name]) || I <- lists:seq(1, 3)],
    io:format("Erlang/OTP ~s~n", [erlang:system_info(otp_release)]).
