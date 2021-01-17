---
layout: post
title:  "Offensive Windows IPC Internals 2: ALPC"
date:   2021-01-10 10:00:00 +0200
abstract: "TODO..."
tags: IPC WinInternals
---

## Contents:
{: .no_toc .toc-header}
* TOC
{:toc}

### Phrase pool

How do we know the structure of an ALPC message?<br>
There are some smart people that figured this out for us and shared their results public, such as [GitHubXXX]
or https://pdfslide.net/reader/f/a-view-into-alpc-rpc-a-view-into-alpc-rpc-introduction-alpc-rpc-uac-advanced

Or we have a look ourselves by:

![ALPC Message Structure](/public/img/2021-01-17-Offensive-Windows-IPC-2-ALPC/ALPC_MessageStruct.png)