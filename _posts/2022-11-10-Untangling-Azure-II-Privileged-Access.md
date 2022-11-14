---
layout: post
title:  "Untangling Azure Active Directory Permissions II: Privileged Access"
coverimg: "/public/img/2022-11-10-Untangling-Azure-II-Privileged-Access/Azure_AD_high_privileged_access_map.png"
date:   2022-11-10 10:00:00 +0200
lastupdate: 2022-11-14 10:00:00 +0200
abstract: "I've focused on using my enumeration learnings to automate the process of identifying high privileged principals in an Azure Active Directory Tenant..."
tags: AzureActiveDirectory
---

## Contents:
{: .no_toc .toc-header}
* TOC
{:toc}

## TL;DR

After focusing highly on service principals in my [previous post](/2022/10/19/Untangling-Azure-Permissions.html), I went on to add Users and Groups into my enumeration script and ended up re-structuring and re-designing the entire thing. I've also focused on using my enumeration learnings to automate the process of identifying high privileged principals in an Azure Active Directory Tenant.<br>
If you came just for the tool, click [here](#azure-accesspermissions-v02) for the fast track.  

## Intro

*A short note before I dive into the matter:<br>
If you haven't already done so, I'd recommend reading through my [previous post](/2022/10/19/Untangling-Azure-Permissions.html) first to not get lost with terminology and concepts*.

As detailed in said previous post, we already figured that there are basically only 3 types of principals that can have access to things:

- Users
- Groups
- Service Principals

In determining "how someone can be granted access to something", I drilled down into the concepts of **AppRoles**, **Application** and **Delegated** API Permissions and finally also into what **Effective Permissions** are. These are important building blocks in describing how a principal gets access to something. However, there are also other building blocks, which I did not cover in the previous post (cause these others are less confusing). This post aims to add these into the picture to get a more complete view.

## AAD Access Concepts

Okay so to begin with let's wrap all of these things that were covered in the previous blog post into this simple statement:

> **A resource application can grant a User/Group/Service principal access to a certain resource or object either via Application-Type or via Delegation-Type API permissions.**

Cool, let's frame that visually:

![First step in Azure Access Controls](/public/img/2022-11-10-Untangling-Azure-II-Privileged-Access/Azure_Access_Controls_1.png "First step in Azure Access Controls")

This is pretty much were we left off with the previous post, so let's add in those less-confusing building blocks to complete the picture.<br>
The next piece in the puzzle is the concept of **Directory Roles**, which you surely have already encountered with or without knowing the name for it. Ever heard of these *roles* in your Azure tenant?

- Global Administrator
- Global Reader
- Billing Administrator
- Teams Administrator
- ...

All of these are examples for a "Directory Role". Putting that in a bit more technical terms one could say a **Directory Role** is a fixed set of permissions defined globally for your tenant. Let me draw a line here to on-premise Active Directory to emphasize the differences for this specific access building block between Active Directory and Azure Active Directory:

If you're coming from an on-premise Active Directory home base, you will know the "Domain Administrators" and "Enterprise Administrators" groups. In (on-premise) Active Directory these are groups with high privilege permissions.<br>
In Azure Active Directory Microsoft wanted a similar experience of granting administrative users (high) privileges by connecting these users to a privileged container, but **in Azure AD Microsoft wanted to decouple the concept of a group from the concept of a role** (*my interpretation/assumption*). While a group is container that clusters users based on a specific attribute, a role is a privilege assignment that can be more ephemeral. A role can be added temporarily or only under specific conditions.

Long story short: A **Directory Role** is not a group in Azure AD, but an independent building block to capsulate access grants. Moreover there are default, already built-in directory roles, such as "Global Reader", "Global Administrator", etc., and there are also **Custom Directory Roles** that a high privileged user - more precisely a user that holds the "Privileged Role Administrator" or "Global Administrator" default directory role - can create to customize access to objects. These latter "custom directory roles", however, come with a literal price tag, as they are only available in Azure Premium P1 or P2 licensed tenants.

Alright, let's add those **Directory Roles** into the picture:

![Second step in Azure Access Controls](/public/img/2022-11-10-Untangling-Azure-II-Privileged-Access/Azure_Access_Controls_2.png "Second step in Azure Access Controls")

As you can see above, **Directory Roles can only be assigned to Users and Groups**, but not to Service Principals.<br>
As a side note: If you want to add a Directory Role to a group, you have to make that decision when you create the group. Only during group creation you can set `isAssignableToRole` property, which is then immutable. Moreover, **the feature to assign a directory role to a group requires a Azure Premium P1 or P2 license**<br>
If this is your first encounter with default and custom directory roles, you want these resource links in your back as a lookup reference:

- [https://learn.microsoft.com/en-us/azure/active-directory/roles/permissions-reference](https://learn.microsoft.com/en-us/azure/active-directory/roles/permissions-reference)
- [https://learn.microsoft.com/en-us/azure/active-directory/roles/custom-create](https://learn.microsoft.com/en-us/azure/active-directory/roles/custom-create)

We're getting close, there is one last building block to add - *at least to my current knowledge*, which is **Ownership**, where ownership grants control over an object.<br>
As there is no big secret in ownership, let's add that right in:

![Third and final step in Azure Access Controls](/public/img/2022-11-10-Untangling-Azure-II-Privileged-Access/Azure_Access_Controls_3.png "Third and final step in Azure Access Controls")

While ownership is not a massively complex concept, it is not immediately obvious **who can own what**, so let me add a small table for *some* of the important Azure AD objects:

|      **Who\What**     	| **User** 	| **Group** 	| **Service Principal** 	| **Application** 	|
|:---------------------:	|:--------:	|:---------:	|:---------------------:	|:---------------:	|
|        **User**       	|    <span style="color: #5b5a5a">No</span>    	|    <b><span style="color: #5ba666">Yes</span></b>    	|          <b><span style="color: #5ba666">Yes</span></b>           	|       <b><span style="color: #5ba666">Yes</span></b>        	|
|       **Group**       	|    <span style="color: #5b5a5a">No</span>    	|     <span style="color: #5b5a5a">No</span>    	|           <span style="color: #5b5a5a">No</span>          	|        <span style="color: #5b5a5a">No</span>       	|
| **Service Principal** 	|    <span style="color: #5b5a5a">No</span>    	|    <b><span style="color: #5ba666">Yes</span></b>     	|           <span style="color: #5b5a5a">No</span>          	|        <span style="color: #5b5a5a">No</span>       	|
|    **Application**    	|    <span style="color: #5b5a5a">No</span>    	|     <span style="color: #5b5a5a">No</span>    	|           <span style="color: #5b5a5a">No</span>          	|        <span style="color: #5b5a5a">No</span>       	|

Looking at this, four things should be noted here:

1. No one can own a user object
2. Group and Application objects can't own other objects
3. A service principal can own a group
4. This table does not contain all objects that can exists in an Azure Active Directory environment.

Also the observant reader might have wondered why I included application objects in the table above, as applications aren't principals that can access other things (as detailed in my [previous post](/2022/10/19/Untangling-Azure-Permissions.html)).<br>
I'm glad you asked, there are two reasons for this:

- Looking at the table one should note that an application object can not own any other object, cause that would make no sense. An application object is not a 'principal' (in my terminology), but instead the service principal associated with the application object can own things. *But that is only a small side benefit of the actual reason, which is:*
- While an application object cannot own any other object it can be owned by other objects (e.g. Users) and on top of that **an application object can have a different owner than its associated service principal**. Meaning that a scenario could arise where you can't control a service principal, but you can control its associated application object and thus could lead to privilege escalation opportunities towards the service principal object.


Alright, that should be a good wrap to cover the building blocks for access permissions in Azure Active Directory. Now let's turn to something more interesting...

## Privileged Access

The reason I initially dived into all of this was because I wanted to figure who are the high privileged principals in an Azure Active Directory tenant.<br>
Similar to on-premise Active Directory environments this questions is not always trivial to answer, primarily due to two reasons:

1. You have to figure out **what makes someone 'high privileged'**, while considering all properties and conditions that could empower a principal. 
2. Once you have carved out all the paths that could lead to high privileges, you have to walk all dependencies to other objects and principals to chain all principals with transitive and/or inherited privileges.

As this is important for the following let me quickly pop two simple examples for these problems.

Problem 1 - What makes someone 'high privileged': The by far most obvious attribute that makes someone high privilege is if this someone holds a **high privileged default directory role**, such as 'Global Administrator'. The problem is finding the not obvious attributes, for example: What about AppRoles? Which AppRoles could make someone high privileged?

Problem 2 - Transitive privileges: Imagine that by doing your magic you found a high privileged service principal. Before closing the book you have to answer if there is any principal that has control over the high privileged service user you just identified. If yes, then that someone must also be considered high privileged. In case a group has control over a privileged entity, then all members of that group might need to be considered high privileged and if that group contains other groups as members you might need traverse through all the nested group memberships and add all members as high privileged principals on the way...

As you might agree at this point: Things can get messy quickly. To not get totally lost and add some structure and guidance on our path to find high privileged principals, I'll map out some visual paths that address the two problems from above. But before I'll get into that, it is important to note two important constraints that went into my mapping process:

Ownership constraints: As said above not every object can be owned and not every principal can own an object. **Most importantly a user object can own all other objects, but cannot be owned itself**. This prevents circular dependencies which is good for our mapping process.

Delegation-Type permissions constraints: In my current understanding of the Azure AD permission jungle a delegation-type permission grant will result in **effective access permissions consisting of the least privileged intersection** of the privileges assigned from the delegation and the privileges initially hold by the requesting principal. Therefore delegation-type permissions should not allow any escalation of privileges or grant any privileged access that the receiving principal did not already hold anyways. In other words: A delegated permission grant can't make you more privileged. Therefore I ignored delegation-type permissions in my mapping process. 

Alright, that should be good enough. Let's map out all the learnings from above and check how each principal can gain high privileges.

![Azure Active Directory Privileged Access Map](/public/img/2022-11-10-Untangling-Azure-II-Privileged-Access/Azure_AD_high_privileged_access_map.png "Azure Active Directory Privileged Access Map")

Studying this figure should also re-enforce some of the constraints mentioned above, and a few additional ones. For example you should see that:

- Groups can't own other objects
- Delegation-Type permission grants should not be relevant for mapping high privileged principals

Aside from these constraints there are should be at least two open questions for anyone wanting to implement this.<br>
A.) Which are the high privileged (default) Directory Roles?<br>
B.) Which are the high privileged Application-Type AppRoles?

Glad you asked:

A.) I doubt there ever will be a definitive answer to this. Over time additional roles will be added and privilege escalation vectors will be discovered for various roles, which Microsoft will deem to be "by design". Anyhow, as of writing this post I considered the 15 roles that Microsoft lists [here](https://learn.microsoft.com/en-us/azure/active-directory/conditional-access/howto-conditional-access-policy-admin-mfa) to be high privileged.  

B.) The same disclaimer from bevor also applies for AppRoles, however there is an additional problem here: Every App developer can freely chose any AppRole value, hence there are only two options to determine if a given AppRole grants high privileged access. Either one could hunt down all the 'typical' high privileged AppRoles that are present in *most* Azure ADs, like 'Directory.ReadWrite.All'... or one could try to programmatically guess the potential privilege value based on the value of an AppRole. I'll took the latter path:

```s
##
## confidence level 
##  0 => Assumed Not high privilege
##  >0 => Assumed high privilege
##  100 => Certainly high privilege
$confidenceLevel = 0
If( $AppRoleObject.Value ){
    If( $AppRoleObject.Value -eq 'Directory.ReadWrite.All' ){
        $confidenceLevel = 100
    }
    ElseIf( $AppRoleObject.Value -Like '*FullControl.All' ){
        $confidenceLevel = 10
    }
    ElseIf( $AppRoleObject.Value -Like '*ReadWrite.All' ){
        $confidenceLevel = 10
    }
    ElseIf( $AppRoleObject.Value -Like 'full_access*' ){
        $confidenceLevel = 10
    }
}
## Return condifence level 
return $confidenceLevel
```

## Azure-AccessPermissions v.0.2 

As said in the beginning I've put all my learnings into a re-worked version of my PowerShell Script. You can find that updated version here: [Azure-AccessPermissions](https://github.com/csandker/Azure-AccessPermissions)

![Azure-AccessPermissions.ps1 v.0.2](/public/img/2022-11-10-Untangling-Azure-II-Privileged-Access/Azure_Access_Permissions_v.0.2_Banner.png "Azure-AccessPermissions.ps1 v.0.2")

![Showcase of Azure-AccessPermissions.ps1 v.0.2](/public/img/2022-11-10-Untangling-Azure-II-Privileged-Access/Azure_Access_Permissions_v.0.2_ShowCase.png "Showcase Azure-AccessPermissions.ps1 v.0.2")


This update brings different enumeration methods for the three principal-types as well as two general enumeration functions, which *try* to dig out as many high privileged principals as I could find.<br>
The important disclaimer here is: I have no illusions that this code (or my current understanding) will cover all cases of hidden privileges. There surely are a ton more privileged edges that I haven't thought about.

... Speaking of edges: Why not use [AzureHound](https://github.com/BloodHoundAD/AzureHound) instead?<br>
You absolutely should (see also next section), I just wanted my own learning path. I've not compared the output results, overlaps or blind spots.


## Adding Global Perspective

You may have wondered what is with all the other Azure resources that you have read about in other blog posts, such as access to Azure VMs or what about read access to SharePoint sites and files, which might as well indicate high access privileges ?!

As of now I've focused my learning path solely on Azure Active Directory. To put that into a visual perspective, be aware that this is what I've talked above:

![Azure Active Directory In its global cosmos](/public/img/2022-11-10-Untangling-Azure-II-Privileged-Access/Azure_And_External_Cosmos.png "Azure Active Directory In its global cosmos")

![lion_king_meme](/public/img/2022-11-10-Untangling-Azure-II-Privileged-Access/lion_king_meme.jpg)
