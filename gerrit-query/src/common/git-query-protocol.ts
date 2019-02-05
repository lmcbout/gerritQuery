/*
 * Copyright (C) 2018 Ericsson and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

export const queryGitPath = '/service/gitQuery';

/**
 * The JSON-RPC query interface.
 */
export const QueryGitServer = Symbol('QueryGitServer');
export interface QueryGitServer {
    setQueryLimit(limit: number): any;
    setCredentials(arg0: string, user: string | undefined, password: string | undefined): any;

    /**
     * Returns with a promise that resolves to the list of git project
     *  as a string. Resolves to `undefined` if the git is not yet set.
     */
    getProject(gerritServer: string): Promise<string | undefined>;

    cloneProject(projectName: string, workspaceRoot: string, gerritServer: string): Promise<string>;

}
