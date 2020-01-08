/*
 * Copyright (C) 2018 Ericsson and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import { injectable } from "inversify";
import * as yargs from 'yargs';
import { CliContribution } from '@theia/core/lib/node';
import URI from "@theia/core/lib/common/uri";

const gitLabProject = '://gitlab.com';

@injectable()
export class GerritClientContribution implements CliContribution {

    private server: string = "";
    uri: URI | undefined;

    configure(conf: yargs.Argv): void {
        conf.option('server', { description: 'The Gerrit server.', type: 'string' });
    }

    setArguments(args: yargs.Arguments): void {
        this.server = args.server;
        if (this.server != undefined) {
            this.uri = new URI(this.server);
        }
    }

    getScheme() {
        if (!!this.uri) {
            return this.uri.scheme;
        }
        return undefined;
    }
    getAuthority() {
        if (!!this.uri) {
            return this.uri.authority;
        }
        return undefined;
    }
    getPath() {
        if (!!this.uri) {
            return this.uri.path;
        }
        return undefined;
    }
    getServer() {
        if (!!this.uri) {
            return this.uri;
        }
        return undefined;
    }

    isGitLabProject(querySite: string): boolean {

        if (querySite.search(gitLabProject) === -1) {
            return false;
        }
        // Git Lab project
        return true;
    }
}
