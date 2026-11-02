#include <stdio.h>

int main(int argc, char **argv) {
    const char *name = argc > 1 ? argv[1] : "Winter Code Fest";

    for (int i = 1; i <= 3; i++) {
        printf("%d: Hello, %s!\n", i, name);
    }
    printf("GCC %s\n", __VERSION__);
    return 0;
}
