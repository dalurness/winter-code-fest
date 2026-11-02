# 32-bit Linux, AT&T syntax, raw int $0x80 system calls
.data
msg:
	.ascii "Hello, Winter Code Fest!\n"
	len = . - msg
digit:
	.ascii "0: "

.text
.global main
main:
	movl  $1, %esi            # loop counter

loop:
	# write "<n>: "
	movl  %esi, %eax
	addb  $'0', %al
	movb  %al, digit
	movl  $4, %eax            # sys_write
	movl  $1, %ebx            # stdout
	movl  $digit, %ecx
	movl  $3, %edx
	int   $0x80

	# write the message
	movl  $4, %eax
	movl  $1, %ebx
	movl  $msg, %ecx
	movl  $len, %edx
	int   $0x80

	inc   %esi
	cmp   $3, %esi
	jle   loop

	movl  $1, %eax            # sys_exit
	movl  $0, %ebx
	int   $0x80
