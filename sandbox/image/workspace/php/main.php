<?php

$name = $argv[1] ?? "Winter Code Fest";

for ($i = 1; $i <= 3; $i++) {
    echo "$i: Hello, $name!\n";
}
echo "PHP " . PHP_VERSION . "\n";
