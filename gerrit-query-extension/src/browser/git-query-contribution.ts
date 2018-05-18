/*
 * Copyright (C) 2018 Ericsson and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */
import { injectable, inject } from "inversify";
import { CommandContribution, CommandRegistry, MenuContribution, MenuModelRegistry} from "@theia/core/lib/common";
import { CommonMenus } from "@theia/core/lib/browser";
import { GerritQueryService } from "./gerrit-query-service";

export const GerritQueryCommand = {
    id: 'GerritQueryService.command',
    label: "Shows a message"
};

@injectable()
export class GerritQueryCommandContribution implements CommandContribution {

    constructor(
        @inject(GerritQueryService) private readonly gerritQueryService: GerritQueryService,
    ) { }

    registerCommands(registry: CommandRegistry): void {
        registry.registerCommand(GerritQueryCommand, {
            execute: () => this.gerritQueryService.search()
        });
    }

}

@injectable()
export class GerritQueryMenuContribution implements MenuContribution {

    registerMenus(menus: MenuModelRegistry): void {
        menus.registerMenuAction(CommonMenus.EDIT_FIND, {
            commandId: GerritQueryCommand.id,
            label: 'List Gerrit Projects'
        });
    }
}
