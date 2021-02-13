---
layout: post
title:  "Offensive Windows IPC Internals 3: ALPC"
date:   2021-01-10 10:00:00 +0200
abstract: "TODO..."
tags: IPC WinInternals
---

## Contents:
{: .no_toc .toc-header}
* TOC
{:toc}

### Phrase pool

ALPC is an internal technology, not intended to be used by programmers -> hence its not documented.

How to find Executables that create an ALPC port

Get-Item "C:\Windows\System32\*.exe" | % { $out=$(C:\"Program Files (x86)"\"Microsoft Visual Studio 14.0"\VC\bin\dumpbin.exe /IMPORTS:ntdll.dll $_.VersionInfo.FileName); If($out -like "*NtAlpcSendWaitReceive*"){Write-Output "[+] $($_)`n`n $($out|%{"$_`n"})" | Out-File -FilePath EXEs_NtAlpcSendWaitReceive.txt -Append } }

How do we know the structure of an ALPC message?<br>
There are some smart people that figured this out for us and shared their results public, such as [GitHubXXX]
or https://pdfslide.net/reader/f/a-view-into-alpc-rpc-a-view-into-alpc-rpc-introduction-alpc-rpc-uac-advanced

Or we have a look ourselves by:

![ALPC Message Structure](/public/img/2021-01-17-Offensive-Windows-IPC-2-ALPC/ALPC_MessageStruct.png)



Reference Projects:
- https://github.com/microsoft/terminal/blob/main/src/interactivity/onecore/ConIoSrvComm.cpp
