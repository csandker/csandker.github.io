---
layout: post
title:  "Kerberos Delegation: A Wrap Up"
date:   2020-02-10 10:00:00 +0200
lastupdate: 2021-08-20 10:00:00 +0200
abstract: "Delegation allows a server application to impersonate a client when the server connects to other network resources.<br>
In other words: Delegation specifies the client's action to authorize a server in order to allow this server to impersonate itself (the client). "
tags: Kerberos
---

## Contents:
{: .no_toc .toc-header}
* TOC
{:toc}

*There many good posts about Kerberos Delegation, explaining the backgrounds, underlying concepts and terminology of it. This post is is a wrap-up of Kerberos Delegation and unlike other posts it will not dig into where it came from and lay out surrounding concepts.*<br>
*Most important: This wrap-up assume the reader is aware of the environment that Kerberos Delegation takes place in.*<br>
**If you need a fresh-up on this read through [Kerberos Authentication: A Wrap Up]({% post_url 2017-09-12-KerberosAuthenticationAWrapUp %})**


Delegation allows a **server** application to **impersonate a client** when the server connects to other network resources.<br>
In other words: Delegation specifies the client's action to authorize a server in order to allow this server to impersonate itself (the client). 

There are 3 Types of Kerberos Delegation:
- Unconstrained 
- Constrained
- Resource Based Constrained

## Unconstrained Delegation

Unconstrained Delegation allows a server to impersonate a client against any service the server wishes to. The client gives the server a wildcard allowance for impersonation.<br>
Server and client are conceptual terms to stress the idea of delegation, read this as the server being a User account and the client being some other user account.

In technical terms this means a server authorized with unconstrained delegation receives the krbtgt service tickets (TGTs) from connecting clients and uses the clients TGT to create new service tickets (requested from the TGS) for any service on behalf of the connecting client.<br>
**>>Take away>>:** A connecting client sends his TGT to a server authorized for unconstrained delegation

![Unconstrained101](/public/img/2020-02-14-KerberosDelegationAWrapUp/Unconstrained101.png)
    
**Who is Authorized For Unconstrained Delegation?**<br>
All Principals that have the **TRUSTED_FOR_DELEGATION** UserAccountControl Attribute<br>
Per default that is only the SYSTEM/Computer-Account on Domain Controller(s)<br>
This UserAccountControl Attribute can be queried using Powershell:

```powershell
([adsisearcher]'(userAccountControl:1.2.840.113556.1.4.803:=524288)').FindAll()
```

The user properties for a user that is allowed for unconstrained delegation is shown below:<br>
![Screenshot_from_2020-01-21_16-51-32](/public/img/2020-02-14-KerberosDelegationAWrapUp/Screenshot_from_2020-01-21_16-51-32.png)
 

**Who is allowed to set the attribute 'TRUSTED_FOR_DELEGATION' for other users?**<br>
All Principals that hold the **SeEnableDelegationPrivilege** privilege.<br>
→ On domain controllers, this right is assigned to the Administrators group by default.

The permission to set the TRUSTED_FOR_DELEGATION attribute for other users is controlled by a user privilege.<br>
User privileges are access rights granted to principals on a local computer (not domain wide access rights). Each system has a database to store which principal has which privileges.<br>
A list of  Privileges (user rights) can be found here: [https://docs.microsoft.com/en-us/windows/security/threat-protection/security-policy-settings/user-rights-assignment](https://docs.microsoft.com/en-us/windows/security/threat-protection/security-policy-settings/user-rights-assignment)

The most efficient way to spread privileges rights within a domain is by the use of Group Policy Objects (GPO) (could also be set locally using secpol.msc)<br>

        

**How can it be abused by an attacker?**

First step is to identify if any principal has the **TRUSTED_FOR_DELEGATION** UserAccountControl attribute set (see ADSISearcher snippet above), let' say this is *UserA*.

If there is a user set with TRUSTED_FOR_DELEGATION (*UserA*), an attacker can steal another user's TGT - let's call that user *UserB* - if:
1. The attacker (*UserA*) can make the victim (*UserB*) connect to a service run by *UserA* (who has the TRUSTED_FOR_DELEGATION attribute set)
2. The attacker (*UserA*) can extract *UserB*'s TGT from the computer where *UserA* run his/her service and that *UserB* connected to.
    
For 1. [@tifkin_'s](https://twitter.com/tifkin_) amazing [SpoolSample.exe](https://github.com/leechristensen/SpoolSample) (also known for being the exploit for "The PrinterBug") can be used to trick an arbitrary ComputerAccount (including the DC-Computer account) to authenticate against a chosen target machine:<br>
```powershell
.\SpoolSample.exe <PDC> <Target-Computer>
```

For 2. Easiest way to extract a TGT is by having local admin access to the targeted Computer, and then using either<br> 
- [Rubeus](https://github.com/GhostPack/Rubeus): `Rubeus.exe monitor`<br>
- [Mimikatz](https://github.com/gentilkiwi/mimikatz): `mimikatz # sekurlsa::tickets /export`

The extracted TGT of the targeted principal (*UserB*) can then in turn be used to connect to arbitrary other services on behalf of the victim, *UserB*.

**An attack chain** could look as follows:<br>
Assume you found found a computer account (ComputerA$) is set with the TRUSTED_FOR_DELEGATION attribute:<br>

> - You managed to compromise ComputerA$<br>
> - You then use [SpoolSample.exe](https://github.com/leechristensen/SpoolSample) to force the Primary Domain Controller (computername: *PDC$*) to connect back to ComputerA$<br>
> - You then use Rubeus or mimikatz to extract the TGT of *PDC$*:<br>
-- [Rubeus](https://github.com/GhostPack/Rubeus): `Rubeus.exe monitor`<br>
-- [Mimikatz](https://github.com/gentilkiwi/mimikatz): `mimikatz # sekurlsa::tickets /export`
> - You can now import the TGT of *PDC$* into mimikatz or Rubeus<br>
-- [Rubeus](https://github.com/GhostPack/Rubeus): ```Rubeus.exe ptt /ticket:doIFODC<<SNIPP>>``` <br>
-- [Mimikatz](https://github.com/gentilkiwi/mimikatz): `kerberos::ptt XXX@YYYY.kirbi` <br>
*(.kirbi files obtained via ```sekurlsa::tickets /export```)*<br>
> - After you imported the TGT of the *PDC$* into your current process you can use that to run a DCSync attack<br>
-- [Mimikatz](https://github.com/gentilkiwi/mimikatz): `mimikatz # lsadump::dcsync /domain:<DOMAIN.FQDN> /user:X`<br>
*X could be any user, e.g. the default (RID 500) admin of the DC, or the krbtgt user*<br>
> - Let's say you set the username (X) to be the default admin (RID 500) account for the *PDC$*<br>
This will return you the *PDC$*'s default admin's NTLM hash<br>
This NTLM hash can in turn be used to request a TGT of that default admin user<br>
-- [Rubeus](https://github.com/GhostPack/Rubeus): `Rubeus.exe asktgt /user:DA01 /rc4:<NTLM-Hash-From-RID-500-Admin> /ptt`<br>
In this command you not only requested the TGT, but also included it in you current process with the **/ptt**-flag<br>
Now that you included the *PDC$* default admin's TGT in your current process, you're basically that user now (within this process).<br>
You can now use your new user access for example by using [PsExec](https://docs.microsoft.com/en-us/sysinternals/downloads/psexec) to add a new user to the local admin group on the *PDC$*<br>
- `C:\> PsExec.exe \\PDC$.FQDN localgroup Administrators <DOMAIN>\<YourUser> /add`<br>



## Constrained Delegation (S4U2Proxy)

Constrained Delegation allows a server to impersonate a client against defined, specified service(s).
Server and client are conceptual terms to stress the idea of delegation, read this as the server being a User account and the client being some other user account.

Let's say a user (*UserA*) connects to a service (let's call it *ServiceA*) using his service ticket for *ServiceA*.<br>
Now *ServiceA* needs to connect to another service (let's call that *ServiceB*) to do it's task, but it needs the permissions of *UserA* to do that.<br>
In short: *ServiceA* wants to impersonate *UserA* and delegates his/her access permissions to *ServiceB*.

This is where Constrained Delegation comes into play. Instead of allowing *ServiceA* to completely impersonating the user (against all services in the domain), *ServiceA* should only be allowed to impersonate *UserA* against *ServiceB*.

The way this is done is as follows:
- *UserA* connects to *ServiceA* using his/her service ticket for *ServiceA*<br>
- *ServiceA* uses a special service, called **S4U2Proxy**, to request a service ticket for *ServiceB* on behalf of *UserA*<br>
- The Kerberos Distribution Center (**KDC**) (which in most cases is part of the DomainController) return a service ticket for *ServiceB* (this service tiicket is issued for *UserA*, hence allowing *ServiceA* to impersonate *UserA* towards *ServiceB*)<br>
- *ServiceA* then connects to *ServiceB* with the returned service ticket for *ServiceB*<br>

![S4U2Proxy](/public/img/2020-02-14-KerberosDelegationAWrapUp/S4U2Proxy.png)

*(Note in red the use of **S4U2Proxy** instead of using the user's TGT, which would require **Unconstrained Delegation**)*

In this case *ServiceA* makes use of the **S4U2Proxy** service in order to request a service for *ServiceB* on behalf of *UserA*.<br>
The S4U2Proxy services requires that the caller (*ServiceA*) presents a valid service ticket for the user that should be impersonated (*UserA*).<br>
This is meant to ensure that the user exists and has really connected to *ServiceA* (otherwise ServiceA would not have the user's service ticket).
There might occur cases where ServiceA can't present a service ticket for the User (because *UserA* hadn't connected via Kerberos), for those cases the **Protocol Transition** with the **S4U2Self** service has been created (we'll get to this in a moment further down below).

Note that the service ticket provided in the S4U2Proxy request must have the **FORWARDABLE** flag set.<br> 
The FORWARDABLE flag is never set for accounts that are configured as "sensitive for delegation" (the **USER_NOT_DELEGATED** attribute is set to true) or for members of the "Protected Users" group.

In order for this to work *ServiceA* must be authorized for Constrained Delegation (more on this below) and must be specified with a defined set of user accounts that can impersonate (meaning where it can delegate a user authentication to).

**An Example** account configuration could look like this:<br>
In the below image ServiceA would be the user *SQLSvc* and ServiceB would be *EXCHANGE01*.<br>
Note here that ServiceA can not impersonate a user against all services of *EXCHANGE01* (ServiceB), but only against the *DCOM* service.<br>
**>>Take away>>:** Constrained Delegation is different to Unconstrained Delegation by only allowing impersonation for specified services. 

![Screenshot_from_2020-01-21_17-04-23](/public/img/2020-02-14-KerberosDelegationAWrapUp/Screenshot_from_2020-01-21_17-04-23.png)

**Who is Authorized For Constrained Delegation?**<br>
All Principals that have the **ms-DS-Allowed-To-Delegate-To** object attribute.<br>
→ Per default no principal has this attribute<br> 

The following Powershell snippet can be used to find all user's that have the ‘ms-DS-Allowed-To-Delegate-To’ object attribute:

```powershell
([adsisearcher]"(msds-allowedtodelegateto=*)").FindAll() | %{$_.Properties['msds-allowedtodelegateto']}
```

**Who is allowed to grant set the ms-DS-Allowed-To-Delegate-To Attribtue for other users?**<br>
All principals that hold the SeEnableDelegationPrivilege privilege.<br>
→ On domain controllers, this right is assigned to the Administrators group by default.


## Constrained Delegation (S4U2Self)
In the "usual" Constrained Delegation process the S4U2Proxy service is required to obtain a service ticket for the user that a service wishes to impersonate. This is meant to ensure that this user exists and has really authenticated to the service that now tries to impersonate him/her.

Let's say *UserA* connected to *ServiceA* and *ServiceA* is allowed to delegate (ms-DS-Allowed-To-Delegate-To) to *ServiceB*.<br>
As *ServiceA* is required to present *UserA*'s service ticket to the S4U2Proxy service, *UserA* is required to connect to *ServiceA* through Kerberos (otherwise there would be no service ticket).<br>
What if the user can't connect to *ServiceA* via Kerberos, but wants to use other authentication mechanisms (NTLM, BasicAuth, ...)<br>
This is where **Protocol Transition** and the **S4U2Self** services come into play.

In the cases where *UserA* does not authenticate to *ServiceA* via Kerberos, *ServiceA* can use the S4U2Self service to create a servuce ticket for *UserA*, which it then in turn can use to run S4U2Proxy as usual.<br>
**→ This means ServiceA can request a service ticket for/to itself for any arbitrary user.**

As this is sensitive operation Microsoft created an additional UserAccountControl Attribute **‘TRUSTED_TO_AUTH_FOR_DELEGATION’**.<br>
Only principals that hold this UserAccountControl attribute can request service ticket to/for itself for any user from the KDC.

Assume *UserA* connected to *ServiceA* via NTLM, the authentication flow then looks like the following (making use of S4U2Self)

![S4U2Self](/public/img/2020-02-14-KerberosDelegationAWrapUp/S4U2Self.png)

An Example account configuration for Unconstrained Delegation with Protocol Transition could look like this:

![Screenshot_from_2020-01-22_16-05-26](/public/img/2020-02-14-KerberosDelegationAWrapUp/Screenshot_from_2020-01-22_16-05-26.png)

**Who is Authorized To Request Service Tickets For Arbitrary Users To Themselfs ?**<br>
All principals that have the **TRUSTED_TO_AUTH_FOR_DELEGATION** UserAccountControl attribute.<br>
→ Per Default no user has this attribute

The following Powershell snippet can be used to find all user's that have the ‘TRUSTED_TO_AUTH_FOR_DELEGATION' UserAccountControl attribute:

```powershell
([adsisearcher]'(userAccountControl:1.2.840.113556.1.4.803:=16777216)').FindAll()
```

The TRUSTED_TO_AUTH_FOR_DELEGATION UserAccountControl attribute should only come along with the "right/permission" for Constrained Delegation (ms-DS-Allowed-To-Delegate-To).<br>
The following snippet list all user accounts that are TRUSTED_TO_AUTH_FOR_DELEGATION, but not ms-DS-Allowed-To-Delegate-To:

```powershell
([adsisearcher]'(&(!msds-allowedtodelegateto=*)(userAccountControl:1.2.840.113556.1.4.80
3:=16777216))').FindAll()
```

## Resource Based Constrained Delegation

For the following view on Resource Based Constrained Delegation let's assume the following:<br>
- *UserA* runs *ServiceA* (let's say a WebServer) on *HostA*<br>
- *UserB* runs *ServiceB* (let's say a SQLServer) on *HostB* <br>
- *ServiceA* wants to delegate to *ServiceB* 

That means *ServiceA* wants to impersonate a user connecting to it to *ServiceB*, to run tasks on *ServiceB* as this connecting User.

In the "conventional" Constrained Delegation an administrator could configure that one defined user (*UserA*) is allowed to delegate to a defined service (*ServiceB*) on a defined host (*HostB*).<br>
In technical terms that means:<br>
A user account holding the **SeEnableDelegationPrivilege** can set **ms-DS-Allowed-To-Delegate-To** account attribute of *UserA* to be 'ServiceB\HostB'.

Let's refer to this "conventional" Constrained based delegation as "Outbound Delegation" for a second.<br>
This makes sense as the granted authorization by the admin points away from the resource (from *UserA* to *ServiceB\HostB*).

By introducing Resource Based Constrained Delegation Microsoft wanted the delegation concept to be more flexible and allow a resource owner (that is a User) to decide who is allowed to delegate to him/her.<br>
To facilitate that Microsoft created the new account attribute **msDS-AllowedToActOnBehalfOfOtherIdentity**.

<u>Instead of an admin</u> (a user holding SeEnableDelegationPrivilege) setting ‘ms-DS-Allowed-To-Delegate-To’ on *UserA*,
<u>any user with write permissions</u> to *UserB*'s 'msDS-AllowedToActOnBehalfOfOtherIdentity’ account attribute can set this attribute to a bitmask representing *UserA*.<br>
→ As *UserB* has write permissions to his/her own account attributes, *UserB* can allow *UserA* to delegate to his/her services without the need of an administrator.

If *UserB*'s 'msDS-AllowedToActOnBehalfOfOtherIdentity’ account attribute is set to *UserA*, *UserA* can request a service ticket for any service run by *UserB*.<br>
→ **Note in “conventional” constraint delegation UserA would only be allowed to request a service ticket for ServiceB run by UserB**

![DelegationTypes](/public/img/2020-02-14-KerberosDelegationAWrapUp/DelegationTypes.png)

**Who is Authorized For Resource Based Constrained Delegation?**<br>
Every User that has his/her identify placed in the 'msDS-AllowedToActOnBehalfOfOtherIdentity' attribute of the user that is targeted for delegation.

You can look for Resource Based Constrained Delegation settings using the following Powershell snippet:

```powershell
PS C:\Users\> ([adsisearcher]"(msds-AllowedToActOnBehalfOfOtherIdentity=*)").FindAll()

Path                                                       Properties
----                                                       ----------
LDAP://CN=EXCHANGE01,CN=Computers,DC=Lab,DC=local {logoncount, codepage, objectcategory, iscriticalsystemob.

## The EXCHANGE01 server has the attribtue set (see PS command below)
```

**Who is Authorized To Configure Resource Constrained Delegation?**<br>
As Resource Based Constrained Delegation is controlled by a user account attribute, every user that has write access (*GenericAll*/*GenericWrite*/*WriteDacl*) to that attribute of a target User can authorize any user to delegate to the services run by that target User.<br>
→ By default each user has access writes to it's own 'msDS-AllowedToActOnBehalfOfOtherIdentity' attribute<br>
→ Every user can decide on it's own who can delegate to his/her services

Note: Resource Based Constrained Delegation can not be set via a GUI application, instead Powershell can be used:

```powershell
PS C:\> Set-ADComputer 'EXCHANGE01' -PrincipalsAllowedToDelegateToAccount (Get-ADComputer 'Client01')
```