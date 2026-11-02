use strict;
use warnings;

my $name = $ARGV[0] // "Winter Code Fest";

for my $i (1 .. 3) {
    print "$i: Hello, $name!\n";
}
printf "Perl %vd\n", $^V;
