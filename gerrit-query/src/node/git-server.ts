/*
 * Copyright (C) 2018 Ericsson and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */
import { injectable, inject } from "inversify";
import { QueryGitServer } from '../common';
import { Deferred } from "@theia/core/lib/common/promise-util";
import { GerritClientContribution } from "./GerritCliContribution";
import { ILogger } from "@theia/core";

import URI from "@theia/core/lib/common/uri";
// var auth = require('basic-auth');

const exec = require('child_process').exec;
const request = require('request');

let gitlabToken: string | undefined = undefined;
let auth: string | undefined = undefined;
let username: string | undefined = undefined;
let password: string | undefined = undefined;
let queryLimit: number = 10;


// Query projects string
//with authentication, need a/projects/
const gerritProjectQuery = `a/projects/?b=master`;
const gitLabProjectQuery = `api/v4/projects`;

const gitClone = `git clone`;


@injectable()
export class GitServerNode implements QueryGitServer {

    @inject(GerritClientContribution)
    protected readonly cliParams!: GerritClientContribution;
    @inject(ILogger)
    protected readonly logger!: ILogger;

    protected workspaceRootUri: string | undefined = undefined;
    gitLabMap = new Map();

    setQueryLimit(limit: number) {
        queryLimit = limit;
    }

    setCredentials(token: string, user: string | undefined, pwd: string | undefined) {
        gitlabToken = token;
        username = user;
        password = pwd;
        auth = this.createBasicAuth();
    }


    getProject(gerritServer: string): Promise<string | undefined> {
        return this.searchForProject(gerritServer);
    }

    cloneProject(projectName: string, workspaceRoot: string, gerritServer: string): Promise<string> {
        return this.cloneSelectedProject(projectName, workspaceRoot, gerritServer);
    }

    protected async  searchForProject(gerritServer: string): Promise<string> {
        const queryServer = this.getQueryServer(gerritServer);
        const deferred = new Deferred<any>();
        const self = this;
        const isGitlab = self.cliParams.isGitLabProject(queryServer);
        let queryForProject = `${gerritProjectQuery}`;

        let options = this.buildGitAuthInfo();

        if (isGitlab) {
            queryForProject = `${gitLabProjectQuery}`;
            options = this.buildGitlabAuthInfo();
        } else {
            if (!(!!auth)) { //When there is NO auth
                queryForProject = queryForProject.slice(2);
                this.logger.info(`Query project with NON AUthentication: ${queryForProject} `);
            }
            this.logger.info(`User authentication: ${auth} `);
        }

        // Adjust the number of items return from the server
        queryForProject = this.addLimit(isGitlab, queryForProject);

        // Build the query 
        let querySite = `${queryServer}/${queryForProject}`;
        this.logger.info(" Query site for projects: " + querySite);

        request(
            querySite,
            options,
            function (error: Error, response: any, body: any) {

                let arrayProject: string[] = new Array();
                if (error) {
                    self.logger.error('Request error: ' + error); // Print the error if one occurred
                    return;
                }
                self.logger.info('Search for Project request server side statusCode:', response && response.statusCode); // Print the response status code if a response was received

                const JSON_NON_EXECUTABLE_PREFIX = ")]}'\n"; // When using Gerrit on Eclipse

                // JB test begin
                // console.log('----------NEXT RESPONSE-------------------------------');
                // console.log(`---JBJB message response: ${response} --------------`);
                // console.log('----------NEXT BODY --------------------------------');
                // console.log(`---JBJB message BODY: ${body} --------------`);
                // console.log('------------------------------------------');
                // JB test end

                // Response status code > 400 involved an Error
                if (response.statusCode >= 400) {
                    self.logger.debug(` code: ${response.statusCode} : ${response.body} `);
                    deferred.reject(new Error(` code: ${response.statusCode} : ${response.body} for server (${queryServer}) `));
                } else {

                    //  Adjust the body string to fit the JSON format
                    let stripBody = body;
                    if (body.toString().lastIndexOf(JSON_NON_EXECUTABLE_PREFIX) > -1) {
                        stripBody = body.substring(JSON_NON_EXECUTABLE_PREFIX.length);
                    }
                    // Verify is we use a Git Lab repo
                    if (isGitlab) {
                        const index = body.toString().indexOf('[');
                        const lastIndex = body.lastIndexOf("]");
                        stripBody = body.slice(index, lastIndex + 1);
                    }

                    self.logger.debug("Message body received: " + stripBody); // Lower debug level

                    let json = JSON.parse(stripBody);

                    // With the GitLab parser, read the value OF JSON and keep the repo url provided
                    if (isGitlab) {
                        for (const property of json) {
                            arrayProject.push(`${property.name}`);
                            self.gitLabMap.set(`${property.name}`, `${property.http_url_to_repo}`);
                        }
                    } else {
                        // JSON structure for Gerrit not in GitLab
                        for (const property in json) {
                            // self.logger.debug(`project:${property}\n   id:${json[property].id}`); // Lower debug level
                            arrayProject.push(`${property}`);
                        }
                    }

                }

                console.log('--- Number of project found : ' + arrayProject.length);

                deferred.resolve(arrayProject.toString());
            });

        const content = await deferred.promise;

        return Promise.resolve(content);
    }


    private addLimit(isGitlab: boolean, queryForProject: string): string {
        if (isGitlab) {
            return `${queryForProject}?&per_page=${queryLimit}`;
        } else {
            return `${queryForProject}&limit=${queryLimit}`;

        }
    }

    private createBasicAuth(): string | undefined {
        if (!!username && username.trim().length >= 1) {
            return "Basic " + new Buffer(username + ":" + password).toString("base64");
        } else {
            return undefined;
        }
    }

    private buildGitAuthInfo(): object {
        if (!!auth && auth !== null) {
            return {
                headers: {
                    "Authorization": auth
                }
            }
        } else {
            // this.logger.info(`gerrit Auth NOT defined, use anonymous`);
            return {};

        }
    }

    private buildGitlabAuthInfo(): object {

        if (!!gitlabToken) {
            this.logger.info(`Using gitlab token: ${gitlabToken}`);
            return {
                headers: {
                    "Private-Token": gitlabToken
                }
            }

        } else {
            this.logger.info(`gitlab token NOT defined, use anonymous`);
            return {};
        }

    }


    private async  cloneSelectedProject(projectName: string, workspaceRoot: string, gerritServer: string): Promise<string> {
        // Eclipse projects have often 2 parts defining the project i.e. egerrit/org.eclipse.egerrit
        // When cloning manually, "git clone ..." will put the project in a folder defined in 
        // the second portion of the name, so I decided to take a siilar approach and when it is defined,
        // I use the second section of the project, otherwise I create the project with the single name
        const origin = projectName.split("/", 2);
        const self = this;

        // Put the first or second parameter of the project  for the path
        let testWorkspace = `${workspaceRoot}/${origin[0]}`;
        if (origin[1]) {
            testWorkspace = `${workspaceRoot}/${origin[1]}`;
        }

        let querySite = this.getQueryServer(gerritServer);
        let gitCommand = this.buildCloneGerritCommand(projectName, querySite);

        const isGitlab = this.cliParams.isGitLabProject(querySite);

        if (isGitlab) {

            gitCommand = this.buildCloneGitlabcommand(projectName);
            self.logger.info('--- Build the gitlab command ----');
        }
        self.logger.info("clone selected project command: " + gitCommand);

        const deferred = new Deferred<any>();

        exec(`${gitCommand} ${testWorkspace}`, function (error: any, response: any, body: any) {
            if (error) {
                self.logger.error('server cloneSelectedProject() error: ' + error); // Print the error if one occurred
                return;
            }
            // Verify if in the respons body has a warning
            const emptyWarning: string = body;
            if (emptyWarning.toLocaleLowerCase().includes('warning')) {
                self.logger.info(emptyWarning); // Print the warning if there is one
            } else {
                self.logger.info('Clone selected project server side statusCode:', response && response.statusCode); // Print the response status code if a response was received

            }

            deferred.resolve(body);
        });
        const content = await deferred.promise;

        return Promise.resolve(content);
    }

    private buildCloneGitlabcommand(projectName: string): string {
        if (!!gitlabToken) {
            // Have token identification
            const projectUri: URI = new URI(this.gitLabMap.get(projectName));
            console.log('-- gitlab uri  \n\tscheme: ' + projectUri.scheme +
                ' \n\tpath: ' + projectUri.path +
                ' \n\tauthority: ' + projectUri.authority +
                ' \n\t command No auth: ' + `${gitClone} ${this.gitLabMap.get(projectName)}`
            );
            return `${gitClone} ${projectUri.scheme}://${gitlabToken}@${projectUri.authority}/${projectUri.path}`;
        } else {
            return `${gitClone} ${this.gitLabMap.get(projectName)}`;

        }
    }

    private buildCloneGerritCommand(projectName: string, querySite: string): string {
        console.log(`---- buildCloneGerritCommand() auth: ${auth}`);
        if (!!auth || auth !== null) {
            // Have User identification
            const projectUri: URI = new URI(querySite);
            console.log('--GERRIT uri  \n\tscheme: ' + projectUri.scheme +
                ' \n\tpath: ' + projectUri.path +
                ' \n\tauthority: ' + projectUri.authority +
                ` \n\t querySite: ` + querySite
            );
            return `${gitClone} ${projectUri.scheme}://${username}:${password}@${projectUri.authority}/a/${projectName}`;
        } else {
            return `${gitClone}${querySite}/${projectName}.git`;

        }
    }

    /**
     * Return the server URI as a string being used for the query. If server provided on the command line,
     *  we use it otherwise, we use the preference one.
     * @param prefServer 
     * @returns string
     */
    private getQueryServer(prefServer: string): string {
        const cliServer = this.cliParams.getServer();
        let useServer = '';
        this.logger.info('getQueryServer().cliServer: ' + cliServer);
        if (!!cliServer && cliServer.toString().trim().length > 0) {
            this.logger.info(" Query server from COMMAND line " + cliServer);
            useServer = cliServer.toString();
        } else {
            this.logger.info(" Query server from PREFRERENCE " + prefServer);
            useServer = prefServer;
        }
        if (useServer.endsWith('/')) {
            this.logger.info(`----git-server.getQueryServer() remove the ending / ---------`);
            useServer = useServer.slice(0, useServer.length - 1);
        }
        return useServer;
    }
}
