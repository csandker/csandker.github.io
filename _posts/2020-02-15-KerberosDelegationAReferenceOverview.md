---
layout: post
title:  "Kerberos Delegation: A Reference Overview"
date:   2020-02-15 10:00:00 +0200
abstract: "There are 3 Delegation types: Unconstrained, Constrained and Resources Based. This post is will list the attributes used to define these types and outline attack paths to abuse misplaced delegation settings"
tags: Kerberos
---

> This post is based on [Kerberos Delegation: A Wrap Up](/2020/02/10/KerberosDelegationAWrapUp.html) make sure to read this first for an introduction to the used terms. 

Delegation allows a **server** application to **impersonate a client** when the server connects to other network resources.<br>
In other words: Delegation specifies the client's action to authorize a server in order to allow this server to impersonate itself (the client). 

There are 3 Types of Kerberos Delegation:
- Unconstrained 
- Constrained
- Resource Based Constrained

## QUICK REFERENCE
**TRUSTED_FOR_DELEGATION**<br>
All users that have the UserAccountControl attribute 'TRUSTED_FOR_DELEGATION' (524288) set are  allowed for unconstrained delegation. Meaning: If you connect to a service run by such a user your TGT will be passed to this service.<br>
→ This is is **Unconstrained Delegation**

Find users with 'TRUSTED_FOR_DELEGATION' with:
```powershell
([adsisearcher]'(userAccountControl:1.2.840.113556.1.4.803:=524288)').FindAll()
```

**ms-DS-Allowed-To-Delegate-To**<br>
All users that have a value specified (specific service on specific host) within the ‘ms-DS-Allowed-To-Delegate-To’ account attribute are allowed to delegate to the specified service on the specified host (on behalf of a user that connected to a service run by this user). Users with this attribute can request a TGS to the specific service using S4U2Proxy.<br>
→ This is is **Constrained Delegation**

Find users with the ‘ms-DS-Allowed-To-Delegate-To’ object attribute:

```powershell
([adsisearcher]"(msds-allowedtodelegateto=*)").FindAll() | %{$_.Properties['msds-allowedtodelegateto']}
```

**TRUSTED_TO_AUTH_FOR_DELEGATION**<br>
All users that have the UserAccountControl attribute 'TRUSTED_TO_AUTH_FOR_DELEGATION' (16777216) set are allowed to request a TGS to itself for any arbitrary user (using S4U2Self).<br>
These users should have a value specified within the ‘ms-DS-Allowed-To-Delegate-To’ account attribute as well. Combining both means: These users are allowed to delegate any arbitrary user to the specified service on the specified host. <br>
→ This is is **Constrained Delegation with allowed Protocol Tranisition** (S4U2Self)

Find users with the 'TRUSTED_TO_AUTH_FOR_DELEGATION' UserAccountControl attribute:

```powershell
([adsisearcher]'(userAccountControl:1.2.840.113556.1.4.803:=16777216)').FindAll()
```

**msDS-AllowedToActOnBehalfOfOtherIdentity**<br>
All users that have a value specified (specific user Identity) within their ‘msDS-AllowedToActOnBehalfOfOtherIdentity’ account attribute allow the specified identity to delegate to services run by them.<br>
→ This is is **Resource Based Constrained Delegation**

Find users with the 'msds-AllowedToActOnBehalfOfOtherIdentity' attribute set:

```powershell
([adsisearcher]"(msds-AllowedToActOnBehalfOfOtherIdentity=*)").FindAll()
```

## ATTACK REFERENCE

Attacker compromised UserAccount with attribute **TRUSTED_FOR_DELEGATION** set:<br>
→ You will receive a TGT from every user connecting to one of your services.<br>

For simplicity assuming the compromised user account is a Computer Account.<br>
Use [@tifkin_'s](https://twitter.com/tifkin_) [SpoolSample.exe](https://github.com/leechristensen/SpoolSample) (also known for being the exploit for "The PrinterBug") to force the DomainController Computer account to connect to you, steal it's TGT and DCSync your way to DomainAdmin.
    
<hr>

Attacker compromised UserAccount with attribute **ms-DS-Allowed-To-Delegate-To** set:<br>
→ You will be able to get a TGS to the service specified in the attribute for any user connecting to you.<br>

For simplicity assuming compromised the user account is a Computer Account<br>
Use [@tifkin_'s](https://twitter.com/tifkin_) [SpoolSample.exe](https://github.com/leechristensen/SpoolSample) (also known for being the exploit for "The PrinterBug") to force the DomainController Computer account to connect to you, get a TGS for the DomainController Computer account to the specified service (Using S4U2Proxy)<br>
→ You gained access to the specified service (e.g. CIFS on the DC)

<hr>

Attacker compromised UserAccount with attribute **TRUSTED_TO_AUTH_FOR_DELEGATION** set:<br>
→ You will be able to get a TGS to yourself for any user<br>

For simplicity assuming compromised the user account is a Computer Account.<br>
Get a TGS for the DomainController Computer account to your services (e.g. cfis) by using **S4U2Self**<br>
→ You already got access to your own services (as you own them), therefore this in itself does not get you anything

If the compromised user account also has the ms-DS-Allowed-To-Delegate-To set (which is likely), you can gain access to the service specified in the ms-DS-Allowed-To-Delegate-To attribute (e.g. CIFS on some host) by using the previously obtained Domain Controller accounts TGS with **S4U2Proxy**<br>
→ You gained access to the specified service (e.g. CIFS on some host) without any user connecting to you (aka. no SpoolSample.exe)

<hr>
        
Attacker compromised UserAccount with attribute **msDS-AllowedToActOnBehalfOfOtherIdentity** set:<br>
→ You can allow any user to get a TGS to any of your services<br>

For simplicity assuming compromised the user account is a Computer Account.<br>
If you compromised the entire user account (e.g. got the user's password) of the account this is barely of any use (as you already have access to the machine).<br>
But if you have gained "only" write access to that user account or this attribute, you can gain access to the account by specifying your own user account. This allows your user account to obtain a TGS to the account by using **S4U2Self** and **S4U2Proxy**<br>

Note: In this case your user account (which you allow to delegate from) does not need to have the TRUSTED_TO_AUTH_FOR_DELEGATION UserAccountControl flag. In Resource Based Constrained Delegation the TGS that you created with S4U2Self, which you then used in S4U2Proxy does not need to have the FORWARDABLE flag (in contrast to classic Constrained Delegation).