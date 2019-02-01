# Eclipse Gerrit Extension Example
The example of how to build the Theia-based applications with the gerrit-query.
This example uses a client-server application with Theia. This extensions reads the list of public Gerrit projects, show it in a list and when selected, clones it in the current workspace. By default, it queries the Eclipse gerrit project "yarn start" or "yarn start --server https://git.eclipse.org/r " , but you can use another gerrit  server. For example, start the application like "yarn start --server <Name of the Gerrit server> ". It can also give you the list of public projects from git lab "yarn start --server https://gitlab.com"

## Getting started

Install [nvm](https://github.com/creationix/nvm#install-script).

    curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.33.5/install.sh | bash

Install npm and node.

    nvm install 8
    nvm use 8

Install yarn.

    npm install -g yarn

## Running the browser example

    yarn rebuild:browser
    cd browser-app
    yarn start

Open http://localhost:3000 in the browser.

## Running the Electron example

    yarn rebuild:electron
    cd electron-app
    yarn start

## Developing with the browser example

Start watching of the gerrit query extension.

    cd theia-gerrit-query
    yarn watch

Start watching of the browser example.

    yarn rebuild:browser
    cd browser-app
    yarn watch

Launch `Start Browser Backend` configuration from VS code.

Open http://localhost:3000 in the browser.

## Developing with the Electron example

Start watching of the git query extension.

    cd theia-gerrit-query
    yarn watch

Start watching of the electron example.

    yarn rebuild:electron
    cd electron-app
    yarn watch

Launch `Start Electron Backend` configuration from VS code.

## [How to configure Gerrit/Gitlab project](https://github.com/lmcbout/gerritQuery/blob/master/configuration.md)

   This will show how to browse and clone projects from the defined query server.
