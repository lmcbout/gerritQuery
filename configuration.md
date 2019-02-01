# Gerrit/GitLab project browsing and cloning a project
This extension allow the end-user to browse through the selected server and if allow to clone the selected project into his/her workspace.

## Functionality

### Basic
This extension is started under the 
**Edit -> List Gerrit Projects**

There is a few ways to use a query server. By default, the server is **"https://gerrit.ericsson.se"**.


  - When you start the application **"yarn start --server \<Name of the Query server\> "** (Override the server being defined in the preference settings)
  - When you start the application **"yarn start"**, It uses the default server but you also have the options to adjust the server from the preference settings. Open the preferences settings: 

```console
	gerrit-query.server: <url>
```

where **\<url\>** can be the following:
- "https://gerrit.ericsson.se" 
- "https://git.eclipse.org/r"
- "https://gitlab.com"


Those preceeding servers have been tested.



### With Authentication

When only the Query server is defined, the query for the list of projects uses the anonymous user. If you want to see more projects, you need to identify yourself. For now, there is two ways:
- Git Lab: you can define a user token [here](https://gitlab.com/profile/personal_access_tokens) and use it in the preferences
 
```console
        gerrit-query.gitlabToken: <token>
``` 

- Gerrit server: need to put you **user/password** in the preference file.
```console
        gerrit-query.gerritUser: <user>,
        gerrit-query.gerritPassword: <password>
```
**Note: For now, if you use the user/password, I would put it in your user preferences instead of the workspace preferences.**

## Limitation

### GitLab
When we use gitlab as the server, the extension is more performant than using the other servers, but only a sub-set of 20  projects are returned. Eventually, if we provide more functionality, we should get a new subset of projects based on the end-user criteria. 

### Gerrit server
Using the Ericsson Gerrit server and anonymous user, the extension extracts ~ 1400 projects. If the end-user is authenticated, Gerrit server returns ~12000 projects. This make the extensions very slow and there is too many projects to scroll from in the menu. We should limit the number of projects at around 20 projects and perform another query according to the criteria provided by the end-user when necessary.

