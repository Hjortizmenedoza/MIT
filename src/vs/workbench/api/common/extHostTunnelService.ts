/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ExtHostTunnelServiceShape } from 'vs/workbench/api/common/extHost.protocol';
import { createDecorator } from 'vs/platform/instantiation/common/instantiation';
import * as vscode from 'vscode';

export interface TunnelOptions {
	remote: { port: number, host: string };
	localPort?: number;
	name?: string;
	closeable?: boolean;
}

export interface TunnelDto {
	remote: { port: number, host: string };
	localAddress: string;
}

export interface IExtHostTunnelService extends ExtHostTunnelServiceShape {
	readonly _serviceBrand: undefined;
	makeTunnel(forward: TunnelOptions): Promise<vscode.Tunnel | undefined>;
}

export const IExtHostTunnelService = createDecorator<IExtHostTunnelService>('IExtHostTunnelService');

export class ExtHostTunnelService implements IExtHostTunnelService {
	_serviceBrand: undefined;
	async makeTunnel(forward: TunnelOptions): Promise<vscode.Tunnel | undefined> {
		return undefined;
	}
	async $findCandidatePorts(): Promise<{ port: number; detail: string; }[]> {
		return [];
	}
}
