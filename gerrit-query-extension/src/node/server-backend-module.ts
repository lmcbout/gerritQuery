/*
 * Copyright (C) 2018 Ericsson and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import { ContainerModule } from 'inversify';
import { ConnectionHandler, JsonRpcConnectionHandler } from '@theia/core/lib/common';
import { GitServerNode } from './git-server';
import { QueryGitServer, queryGitPath } from '../common';
import { GerritClientContribution } from './GerritCliContribution';
import { CliContribution } from '@theia/core/lib/node';

export default new ContainerModule(bind => {

    bind(GitServerNode).toSelf().inSingletonScope();

    bind(QueryGitServer).toDynamicValue(ctx =>
        ctx.container.get(GitServerNode)
    ).inSingletonScope();

    bind(ConnectionHandler).toDynamicValue(ctx =>
        new JsonRpcConnectionHandler(queryGitPath, () =>
            ctx.container.get(QueryGitServer)
        )
    ).inSingletonScope();

    bind(GerritClientContribution).toSelf().inSingletonScope();
    bind(CliContribution).toDynamicValue(ctx => ctx.container.get(GerritClientContribution));

});
