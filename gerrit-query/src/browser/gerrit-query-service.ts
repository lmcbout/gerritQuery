/*
 * Copyright (C) 2018 Ericsson and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */
import { inject, injectable } from "inversify";
import { FileSystem } from '@theia/filesystem/lib/common/filesystem';
import { MessageService } from "@theia/core/lib/common";
import { QueryGitServer } from '../common';
import { QuickOpenService, QuickOpenModel, QuickOpenItem, QuickOpenMode } from "@theia/core/lib/browser/quick-open/";
import { WorkspaceService } from '@theia/workspace/lib/browser';
import URI from "@theia/core/lib/common/uri";
import { GitQueryPreferences } from "./git-query-preferences";

@injectable()
export class GerritQueryService implements QuickOpenModel {

    protected items: QuickOpenItem[] = [];
    protected workspaceRootUri: string | undefined = undefined;

    constructor(
        @inject(FileSystem) protected readonly fileSystem: FileSystem,
        @inject(MessageService) private readonly messageService: MessageService,
        @inject(QuickOpenService) protected readonly quickOpenService: QuickOpenService,
        @inject(QueryGitServer)
        protected readonly server: QueryGitServer,
        @inject(WorkspaceService)
        protected readonly workspaceService: WorkspaceService,
        @inject(GitQueryPreferences)
        protected readonly preferences: GitQueryPreferences,
    ) {
        // wait for the workspace root to be set
        this.workspaceService.roots.then(async root => {
            if (root) {
                this.workspaceRootUri = new URI(root[0].uri).withoutScheme().toString();
            }
        });

    }

    open(value: string): void {
        this.items = [];
        const projects: string[] = value.split(",");
        for (const project of projects) {
            this.items.push(new ProjectQuickOpenItem(this.workspaceRootUri, project, this.server, this.messageService, this.preferences[`git-query.server`]));
        }
        this.quickOpenService.open(this, {
            placeholder: 'Type the name of the project you want to clone',
            fuzzyMatchLabel: true,
            fuzzySort: true
        });
    }
    onType(lookFor: string, acceptor: (items: QuickOpenItem[]) => void): void {
        acceptor(this.items);
    }

    // Command initiated from the menu
    search() {
        this.items = [];
        this.messageService.info("Potential list of Eclipse projects to clone will show shortly");

        this.server.getProject(this.preferences[`git-query.server`]).then((projects) => {
            if (projects) {
                this.open(projects);
            }
        });
    }

}

export class ProjectQuickOpenItem extends QuickOpenItem {

    constructor(
        @inject(WorkspaceService)
        protected readonly workspaceRoot: string | undefined,
        protected readonly projectLabel: string,
        protected projectServer: QueryGitServer,
        @inject(MessageService) private readonly messageService: MessageService,
        protected readonly gerritServer: string,
    ) {
        super();
    }

    getLabel(): string {
        return this.projectLabel;
    }

    run(mode: QuickOpenMode): boolean {
        if (mode !== QuickOpenMode.OPEN) {
            return false;
        }

        let workspacePath = "./"; // if the workspaceroot is not defined, use folder where you started
        if (this.workspaceRoot) {
            workspacePath = this.workspaceRoot;
        }
        this.projectServer.cloneProject(this.getLabel(), workspacePath, this.gerritServer)
            .then((content) => {
                // Data received after cloning the project repositories
                if (content.startsWith('fatal')) {
                    //  Project already exist in th current folder
                    this.messageService.error(content);
                } else {
                    //  Clone success;
                    this.messageService.info(content + "\n Clone completed");
                }
            });

        return true;
    }
}
