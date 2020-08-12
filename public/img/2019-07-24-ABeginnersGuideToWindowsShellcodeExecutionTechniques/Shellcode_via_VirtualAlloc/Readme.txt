## Guide to these Screenshots

### Open "VirtualAllocShellcode_SHCLocatedOnStack"

- We're in the main() function of Main.c shown on the left
- The breakpoint is currently set on address "00a0177c"
- Meaning we are AFTER the assignment of the variable "shellcode", but BEFORE the call to "VirtualAlloc"

- From address "00a0176a" to "00a01779" the shellcode is placed on the stack at address "005afa20" (EBP-14)
- Remember here that the EBP is the base pointer to the stack, pointing to the first stack address


###  Open "MemoryLayout_Before_MoveMemory"

- We're now one instruction before the call to "MoveMemory" at "00a017a2" 
- The parameters to Move Memory, which are
    - Address Pointer to the destination location
    - Source Content to move
    - Length of Source Content

  are pushed onto the stack in reverse order:
    - The length (9 -> 8 chars + \x00) is pushed in 00a01799
    - The source is loaded in 00a0179b and pushed in 00a0179e (EBP-14 -> as we have seen before)
    - The Destination address pointer is pushed in 00a017a2 (EBP-20)
 
- A look at the memory location stored at EBP-20/ECX (which is the location address: 00420000) reveals that this memory location is currently empty


### Open "MemoryLayout_After_MoveMemroy"

- We're now at one instruction after the call to "MoveMemory" at "00a017a8"
- We can see now , in the "Memory" window, that our shellcode has been placed at the referenced address
- Also note: The reference address (00420000) is not on the Stack, as it's not in range between EBP and ESP, but is located somewhere below the Stack, which  indicates that we're looking at the HEAP here

- The programm will now continue to create a new thread, pointing that thread to our HEAP location and execute it. 







