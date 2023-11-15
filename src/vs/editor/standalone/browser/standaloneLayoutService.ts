/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as dom from 'vs/base/browser/dom';
import { Event } from 'vs/base/common/event';
import { ILayoutService, ILayoutOffsetInfo } from 'vs/platform/layout/browser/layoutService';
import { ICodeEditorService } from 'vs/editor/browser/services/codeEditorService';
import { InstantiationType, registerSingleton } from 'vs/platform/instantiation/common/extensions';
import { coalesce } from 'vs/base/common/arrays';
import { mainWindow } from 'vs/base/browser/window';

class StandaloneLayoutService implements ILayoutService {
	declare readonly _serviceBrand: undefined;

	readonly onDidLayoutMainContainer = Event.None;
	readonly onDidLayoutActiveContainer = Event.None;
	readonly onDidLayoutContainer = Event.None;
	readonly onDidChangeActiveContainer = Event.None;
	readonly onDidAddContainer = Event.None;

	private _dimension?: dom.IDimension;
	get mainContainerDimension(): dom.IDimension {
		if (!this._dimension) {
			this._dimension = dom.getClientArea(mainWindow.document.body);
		}

		return this._dimension;
	}

	get activeContainerDimension() { return this.mainContainerDimension; }

	readonly mainContainerOffset: ILayoutOffsetInfo = { top: 0, quickPickTop: 0 };
	readonly activeContainerOffset: ILayoutOffsetInfo = { top: 0, quickPickTop: 0 };

	get hasContainer(): boolean {
		return false;
	}

	get mainContainer(): HTMLElement {
		// On a page, multiple editors can be created. Therefore, there are multiple containers, not
		// just a single one. Please use `activeContainer` to get the current focused code editor
		// and use its container if necessary. You can also instantiate `EditorScopedLayoutService`
		// which implements `ILayoutService` but is not a part of the service collection because
		// it is code editor instance specific.
		throw new Error(`ILayoutService.mainContainer is not available in the standalone editor!`);
	}

	get containers(): Iterable<HTMLElement> {
		return coalesce(this._codeEditorService.listCodeEditors().map(codeEditor => codeEditor.getContainerDomNode()));
	}

	get activeContainer(): HTMLElement {
		const activeCodeEditor = this._codeEditorService.getFocusedCodeEditor() ?? this._codeEditorService.getActiveCodeEditor();

		return activeCodeEditor?.getContainerDomNode() ?? this.mainContainer;
	}

	getContainer() {
		return this.activeContainer;
	}

	focus(): void {
		this._codeEditorService.getFocusedCodeEditor()?.focus();
	}

	constructor(
		@ICodeEditorService private _codeEditorService: ICodeEditorService
	) { }

}

export class EditorScopedLayoutService extends StandaloneLayoutService {
	override get hasContainer(): boolean {
		return false;
	}
	override get mainContainer(): HTMLElement {
		return this._container;
	}
	constructor(
		private _container: HTMLElement,
		@ICodeEditorService codeEditorService: ICodeEditorService,
	) {
		super(codeEditorService);
	}
}

registerSingleton(ILayoutService, StandaloneLayoutService, InstantiationType.Delayed);
