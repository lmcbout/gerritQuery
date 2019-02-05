/********************************************************************************
 * Copyright (C) 2018 Ericsson and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0.
 *
 * This Source Code may also be made available under the following Secondary
 * Licenses when the conditions for such availability set forth in the Eclipse
 * Public License v. 2.0 are satisfied: GNU General Public License, version 2
 * with the GNU Classpath Exception which is available at
 * https://www.gnu.org/software/classpath/license.html.
 *
 * SPDX-License-Identifier: EPL-2.0 OR GPL-2.0 WITH Classpath-exception-2.0
 ********************************************************************************/

import { interfaces } from 'inversify';
import {
    createPreferenceProxy,
    PreferenceProxy,
    PreferenceService,
    PreferenceContribution,
    PreferenceSchema
} from '@theia/core/lib/browser';

export const GitQueryConfigSchema: PreferenceSchema = {
    type: 'object',
    properties: {
        'gerrit-query.server': {
            type: 'string',
            description: 'Gerrit server to query.',
            default: "https://gerrit.ericsson.se"
        },
        'gerrit-query.gitlabToken': {
            type: 'string',
            description: 'Token used for Gitlab authentication.',
            default: undefined
        },
        'gerrit-query.gerritUser': {
            type: 'string',
            description: 'User login used for Gerrit authentication.',
            default: undefined
        },
        'gerrit-query.gerritPassword': {
            type: 'string',
            description: 'Password used for Gerrit authentication.',
            default: undefined
        },
        'gerrit-query.limit': {
            type: 'number',
            description: 'Query limit the number of result.',
            default: 20
        },
    }
};

export interface GitQueryConfiguration {
    'gerrit-query.server': string;
    'gerrit-query.gitlabToken': string;
    'gerrit-query.gerritUser': string;
    'gerrit-query.gerritPassword': string;
    'gerrit-query.limit': number;
}

export const GitQueryPreferences = Symbol('GitQueryPreferences');
export type GitQueryPreferences = PreferenceProxy<GitQueryConfiguration>;

export function createGitQueryPreferences(
    preferences: PreferenceService
): GitQueryPreferences {
    return createPreferenceProxy(preferences, GitQueryConfigSchema);
}

export function bindGitQueryPreferences(bind: interfaces.Bind): void {
    bind(GitQueryPreferences).toDynamicValue(ctx => {
        const preferences = ctx.container.get<PreferenceService>(PreferenceService);
        return createGitQueryPreferences(preferences);
    });
    bind(PreferenceContribution).toConstantValue({ schema: GitQueryConfigSchema });
}

