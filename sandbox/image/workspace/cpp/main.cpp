#include <iostream>
#include <string>

int main(int argc, char **argv) {
    std::string name = argc > 1 ? argv[1] : "Winter Code Fest";

    for (int i = 1; i <= 3; i++) {
        std::cout << i << ": Hello, " << name << "!\n";
    }
    std::cout << "G++ " << __VERSION__ << "\n";
}
