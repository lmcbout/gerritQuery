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

const request = require('request');
const exec = require('child_process').exec;

// Query projects string
const gerritProjectQuery = `projects/?b=master`;
const gitLabProjectQuery = `api/v4/projects`;

const gitClone = `git clone `;

@injectable()
export class GitServerNode implements QueryGitServer {

    @inject(GerritClientContribution)
    protected readonly cliParams!: GerritClientContribution;
    @inject(ILogger)
    protected readonly logger!: ILogger;

    protected workspaceRootUri: string | undefined = undefined;
    gitLabMap = new Map();

    getProject(gerritServer: string): Promise<string | undefined> {
        return this.searchForProject(gerritServer);
    }

    cloneProject(projectName: string, workspaceRoot: string, gerritServer: string): Promise<string> {
        return this.cloneSelectedProject(projectName, workspaceRoot, gerritServer);
    }

    protected async  searchForProject(gerritServer: string): Promise<string> {
        let querySite = this.getQueryServer(gerritServer);
        const deferred = new Deferred<any>();
        const self = this;
        const isGitlab = self.cliParams.isGitLabProject(querySite);
        let queryProject = `${gerritProjectQuery}`;

        if (isGitlab) {
            queryProject = `${gitLabProjectQuery}`;
        }
        // Build the query 
        querySite = `${querySite}/${queryProject}`;

        this.logger.info(" Query site for projects: " + querySite);

        request(querySite, function (error: Error, response: any, body: any) {
            let arrayProject: string[] = new Array();

            if (error) {
                self.logger.error('Request error: ' + error); // Print the error if one occurred
                return;
            }
            self.logger.info('Search for Project request server side statusCode:', response && response.statusCode); // Print the response status code if a response was received

            const JSON_NON_EXECUTABLE_PREFIX = ")]}'\n"; // When using Gerrit on Eclipse

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
                    self.logger.debug(`project:${property}\n   id:${json[property].id}`); // Lower debug level
                    arrayProject.push(`${property}`);
                }
            }
            deferred.resolve(arrayProject.toString());
        });

        const content = await deferred.promise;

        return Promise.resolve(content);
    }

    protected async  cloneSelectedProject(projectName: string, workspaceRoot: string, gerritServer: string): Promise<string> {
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
        let gitCommand = `${gitClone}${querySite}/${projectName}.git`;
        const isGitlab = this.cliParams.isGitLabProject(querySite);

        if (isGitlab) {
            gitCommand = `${gitClone} ${this.gitLabMap.get(projectName)}`;
        }
        self.logger.info("clone selected project command: " + gitCommand);

        const deferred = new Deferred<any>();

        exec(`${gitCommand} ${testWorkspace}`, function (error: any, response: any, body: any) {
            if (error) {
                self.logger.error('server cloneSelectedProject() error: ' + error); // Print the error if one occurred
                return;
            }
            self.logger.info('Clone selected project server side statusCode:', response && response.statusCode); // Print the response status code if a response was received

            deferred.resolve(body);
        });
        const content = await deferred.promise;

        return Promise.resolve(content);
    }

    /**
     * Return the server URI as a string being used for the query. If server provided on the command line,
     *  we use it otherwise, we use the preference one.
     * @param prefServer 
     * @returns string
     */
    protected getQueryServer(prefServer: string): string {
        const cliServer = this.cliParams.getServer();
        let useServer = '';
        console.log('getQueryServer().cliServer: ' + cliServer);
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
