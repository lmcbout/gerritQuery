/*
 * Copyright (C) 2018 Ericsson and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import { GerritQueryCommandContribution, GerritQueryMenuContribution } from './git-query-contribution';
import {
    CommandContribution,
    MenuContribution
} from "@theia/core/lib/common";
import {GerritQueryService} from './gerrit-query-service'
import { ContainerModule } from "inversify";
import { WebSocketConnectionProvider } from '@theia/core/lib/browser';
import { queryGitPath, QueryGitServer } from '../common/git-query-protocol';

export default new ContainerModule(bind => {
    // add your contribution bindings here
    bind(QueryGitServer).toDynamicValue(ctx => {
        const provider = ctx.container.get(WebSocketConnectionProvider);
        return provider.createProxy<QueryGitServer>(queryGitPath);
    }).inSingletonScope();
    bind(CommandContribution).to(GerritQueryCommandContribution);

    bind(MenuContribution).to(GerritQueryMenuContribution);
    bind(GerritQueryService).toSelf().inSingletonScope();

});