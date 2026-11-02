# Loops LOOPS times and exits, with no libc. Built with LOOPS=0 and LOOPS=N,
# the two run exactly 2N instructions apart, so sb can measure how much
# background work (timer interrupts and the like) the guest does while busy.
.globl _start
_start:
	movl  $LOOPS, %ecx
	testl %ecx, %ecx
	jz    2f
1:	decl  %ecx
	jnz   1b
2:	movl  $1, %eax            # sys_exit
	xorl  %ebx, %ebx
	int   $0x80
