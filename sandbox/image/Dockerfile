# Based on v86's tools/docker/alpine/Dockerfile (copy/v86@cc37f35c), bumped to
# Alpine 3.24 for nodejs-current 26. v86 has no 64-bit or PAE support, so the
# whole image is 32-bit x86.
FROM docker.io/i386/alpine:3.24

ENV KERNEL=virt

# Each install records the files it added, so the page can download a
# language's files together (see bundle.py). Shared dependencies count for
# the first install that pulled them in.
COPY --chmod=755 bundle-mark /usr/local/bin/bundle-mark
RUN mkdir /.bundles

# The apk cache mount keeps downloaded packages out of the image but reused
# across builds, so changing the package list does not re-download everything
RUN --mount=type=cache,target=/etc/apk/cache apk add openrc alpine-base agetty alpine-conf linux-$KERNEL linux-firmware-none \
      tmux bash sqlite zstd \
 && bundle-mark base
RUN --mount=type=cache,target=/etc/apk/cache apk add build-base && bundle-mark c
RUN --mount=type=cache,target=/etc/apk/cache apk add nodejs-current && bundle-mark node
RUN --mount=type=cache,target=/etc/apk/cache apk add go && bundle-mark go
RUN --mount=type=cache,target=/etc/apk/cache apk add ruby && bundle-mark ruby
RUN --mount=type=cache,target=/etc/apk/cache apk add python3 && bundle-mark python
RUN --mount=type=cache,target=/etc/apk/cache apk add rust cargo && bundle-mark rust
RUN --mount=type=cache,target=/etc/apk/cache apk add elixir gleam && bundle-mark beam
RUN --mount=type=cache,target=/etc/apk/cache apk add lua5.4 \
 && ln -s lua5.4 /usr/bin/lua && ln -s luac5.4 /usr/bin/luac && bundle-mark lua
RUN --mount=type=cache,target=/etc/apk/cache apk add php85 && bundle-mark php
RUN --mount=type=cache,target=/etc/apk/cache apk add perl && bundle-mark perl

# Zig is not packaged for x86 in Alpine; use the official static build
ARG ZIG_VERSION=0.15.2
ARG ZIG_SHA256=4c6e23f39daa305e274197bfdff0d56ffd1750fc1de226ae10505c0eff52d7a5
RUN wget -q https://ziglang.org/download/$ZIG_VERSION/zig-x86-linux-$ZIG_VERSION.tar.xz -O /tmp/zig.tar.xz \
 && echo "$ZIG_SHA256  /tmp/zig.tar.xz" | sha256sum -c - \
 && mkdir /opt/zig && tar xJf /tmp/zig.tar.xz -C /opt/zig --strip-components=1 \
 && rm /tmp/zig.tar.xz && ln -s /opt/zig/zig /usr/local/bin/zig && bundle-mark zig

# Clank has no releases for x86; build it with the Go above. The template gets
# the spec from the same commit, so the two always match.
ARG CLANK_COMMIT=cb913c1f74a4ee695084336e0876def82c8e84c8
ARG CLANK_SHA256=ef9864d64b7076e97ab7ac67aace953eeb62e4b4de3f8c1afe1859889631cad2
RUN wget -q https://github.com/dalurness/clank/archive/$CLANK_COMMIT.tar.gz -O /tmp/clank.tar.gz \
 && echo "$CLANK_SHA256  /tmp/clank.tar.gz" | sha256sum -c - \
 && mkdir /tmp/clank && tar xzf /tmp/clank.tar.gz -C /tmp/clank --strip-components=1 \
 && cd /tmp/clank \
 && GOTOOLCHAIN=local GOCACHE=/tmp/clank-cache go build -trimpath \
      -ldflags "-s -w -X main.Version=${CLANK_COMMIT%${CLANK_COMMIT#???????}}" \
      -o /usr/local/bin/clank ./cmd/clank \
 && install -D -m 644 SPEC.md /workspace/clank/SPEC.md \
 && cd / && rm -rf /tmp/clank /tmp/clank.tar.gz /tmp/clank-cache && bundle-mark clank

# ttyS0 is the main terminal, ttyS1 the optional second one. Both log in as
# root with no password. ttyS2 is sb-agent's line to the page.
RUN sed -i 's/^tty1::/#tty1::/' /etc/inittab \
 && echo 'ttyS0::respawn:/sbin/agetty --autologin root -s ttyS0 115200 xterm-256color' >> /etc/inittab \
 && echo 'ttyS1::respawn:/sbin/agetty --autologin root -s ttyS1 115200 xterm-256color' >> /etc/inittab \
 && echo 'ttyS2::respawn:/usr/local/bin/sb-agent' >> /etc/inittab \
 && echo "root:" | chpasswd

RUN setup-hostname sandbox

# https://wiki.alpinelinux.org/wiki/Alpine_Linux_in_a_chroot#Preparing_init_services
RUN for i in devfs dmesg mdev hwdrivers; do rc-update add $i sysinit; done
# No bootmisc: it only creates X11/ICE dirs in /tmp and log files nobody reads
RUN for i in hwclock modules sysctl hostname; do rc-update add $i boot; done
RUN rc-update add killprocs shutdown

# Generate initramfs with 9p modules
RUN mkinitfs -F "base virtio 9p" $(cat /usr/share/kernel/$KERNEL/kernel.release)

# Drop docs, man pages and locales that nobody reads in the sandbox. This keeps
# fs.json smaller.
RUN rm -rf /usr/share/doc /usr/share/man /usr/share/info /usr/lib/rustlib/src \
      /usr/share/locale /usr/lib/go/doc /usr/lib/go/test /usr/lib/go/api /usr/lib/erlang/lib/*/doc /opt/zig/doc

# NODE_COMPILE_CACHE keeps V8's compiled code on disk between runs
ENV CARGO_NET_OFFLINE=true GOTOOLCHAIN=local GOFLAGS=-mod=mod NODE_COMPILE_CACHE=/root/.cache/node
RUN printf '%s\n' \
      'export CARGO_NET_OFFLINE=true GOTOOLCHAIN=local GOFLAGS=-mod=mod NODE_COMPILE_CACHE=/root/.cache/node' \
      'export PS1="\w \$ "' \
      'cd /workspace' >> /root/.profile

COPY --chmod=755 sb sb-agent /usr/local/bin/
# sb subtracts estimates of what is not the program from its instruction counts:
# - sb-empty only exits, linked against libc like most programs, for the cost
#   of starting and ending a process
# - sb-spin0 and sb-spin differ by a loop of exactly 2 × SPIN_LOOPS
#   instructions, for the rate of background work while the guest is busy
ARG SPIN_LOOPS=25000000
COPY spin.s /tmp/spin.s
RUN printf 'int main(void) { return 0; }\n' | cc -O2 -x c -o /usr/local/bin/sb-empty - \
 && cc -nostdlib -static -Wa,--defsym,LOOPS=0 -o /usr/local/bin/sb-spin0 /tmp/spin.s \
 && cc -nostdlib -static -Wa,--defsym,LOOPS=$SPIN_LOOPS -o /usr/local/bin/sb-spin /tmp/spin.s \
 && echo $((2 * SPIN_LOOPS)) > /usr/local/share/sb-spin-instructions \
 && rm /tmp/spin.s
RUN mkdir /.sb
COPY workspace/ /workspace/

# Run each template once so build caches (cargo target/, Go's build and go run
# caches, zig-cache, gleam build/, Node's compile cache) are warm. Gleam fetches
# its hex packages here because the VM has no network. Also compile all of Go's
# standard library, so a new import in the VM is a cache hit instead of a
# compile at emulated speed.
# They run in parallel; output is buffered per template so it stays readable.
RUN for dir in /workspace/*/; do \
      (cd "$dir" && chmod +x run.sh && ./run.sh > /tmp/warm.$(basename "$dir").log 2>&1) & \
    done; \
    (go build std > /tmp/warm.go-std.log 2>&1) & \
    failed=0; for job in $(jobs -p); do wait "$job" || failed=1; done; \
    for log in /tmp/warm.*.log; do echo "== $log"; cat "$log"; done; \
    rm /tmp/warm.*.log; exit $failed

# Remove what the VM can never use, after the warm-up so it still builds:
# - bundle-mark's working files
# - apk and alpine-conf: there is no network to install packages from
# - cron's directories: nothing schedules jobs in a throwaway VM
# - Zig's headers and libcs for other targets: only x86-linux-musl runs here
# - Erlang apps for GUIs, SNMP, telecom, ODBC, Java, FTP, SSH and LDAP
# - Go's toolchain sources: go run uses the prebuilt tools in pkg/tool
# - Python's bundled pip: there is no network to install packages from
# - Kernel modules for hardware v86 does not emulate
RUN apk del --no-network alpine-conf \
 && rm /usr/local/bin/bundle-mark /.bundles/.before \
 && rm -rf /sbin/apk /usr/lib/libapk.so* /etc/apk /lib/apk /var/cache/apk /usr/share/apk \
      /etc/periodic /etc/crontabs /var/spool/cron \
      /opt/zig/lib/libc/darwin /opt/zig/lib/libc/freebsd /opt/zig/lib/libc/glibc \
      /opt/zig/lib/libc/mingw /opt/zig/lib/libc/netbsd /opt/zig/lib/libc/wasi \
      /usr/lib/go/src/cmd /usr/lib/python3.*/ensurepip \
 && find /opt/zig/lib/libc/include -mindepth 1 -maxdepth 1 \
      ! -name 'x86-linux-musl' ! -name 'x86-linux-any' ! -name any-linux-any ! -name generic-musl \
      -exec rm -rf {} + \
 && cd /usr/lib/erlang/lib && rm -rf common_test-* diameter-* eldap-* et-* ftp-* jinterface-* \
      megaco-* observer-* odbc-* snmp-* ssh-* tftp-* wx-* \
 && release=$(cat /usr/share/kernel/$KERNEL/kernel.release) \
 && cd /lib/modules/$release/kernel/drivers \
 && rm -rf hv iommu md nvme ptp rpmsg usb vdpa vhost watchdog xen \
 && depmod $release
