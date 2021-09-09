/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { DisposableStore } from 'vs/base/common/lifecycle';
import { URI } from 'vs/base/common/uri';
import { ExtHostContext, IExtHostEditorTabsShape, IExtHostContext, MainContext, IEditorTabDto } from 'vs/workbench/api/common/extHost.protocol';
import { extHostNamedCustomer } from 'vs/workbench/api/common/extHostCustomers';
import { EditorResourceAccessor, IEditorChangeEvent, SideBySideEditor } from 'vs/workbench/common/editor';
import { SideBySideEditorInput } from 'vs/workbench/common/editor/sideBySideEditorInput';
import { editorGroupToColumn } from 'vs/workbench/services/editor/common/editorGroupColumn';
import { GroupChangeKind, IEditorGroupsService } from 'vs/workbench/services/editor/common/editorGroupsService';
import { IEditorService } from 'vs/workbench/services/editor/common/editorService';


@extHostNamedCustomer(MainContext.MainThreadEditorTabs)
export class MainThreadEditorTabs {

	private readonly _dispoables = new DisposableStore();
	private readonly _proxy: IExtHostEditorTabsShape;
	private readonly _tabModel: Map<number, IEditorTabDto[]> = new Map<number, IEditorTabDto[]>();
	private _currentlyActiveTab: IEditorTabDto | undefined = undefined;

	constructor(
		extHostContext: IExtHostContext,
		@IEditorGroupsService private readonly _editorGroupsService: IEditorGroupsService,
		@IEditorService editorService: IEditorService
	) {

		this._proxy = extHostContext.getProxy(ExtHostContext.ExtHostEditorTabs);

		this._dispoables.add(editorService.onDidEditorsChange((e) => this._updateTabsModel(e), this));
		this._editorGroupsService.whenReady.then(() => this._createTabsModel());
	}

	dispose(): void {
		this._dispoables.dispose();
	}

	private _createTabsModel(): void {
		this._tabModel.clear();
		let tabs: IEditorTabDto[] = [];
		for (const group of this._editorGroupsService.groups) {
			for (const editor of group.editors) {
				if (editor.isDisposed()) {
					continue;
				}
				const tab = {
					viewColumn: editorGroupToColumn(this._editorGroupsService, group),
					label: editor.getName(),
					resource: editor instanceof SideBySideEditorInput ? EditorResourceAccessor.getCanonicalUri(editor, { supportSideBySide: SideBySideEditor.PRIMARY }) : EditorResourceAccessor.getCanonicalUri(editor),
					editorId: editor.editorId,
					isActive: (this._editorGroupsService.activeGroup === group) && group.isActive(editor)
				};
				if (tab.isActive) {
					this._currentlyActiveTab = tab;
				}
				tabs.push(tab);
			}
			this._tabModel.set(group.id, tabs);
		}
		this._proxy.$acceptEditorTabs(tabs);
	}

	private _onDidTabOpen(event: IEditorChangeEvent): void {
		if (event.kind !== GroupChangeKind.EDITOR_OPEN || !event.editorIndex || !event.editor) {
			return;
		}
		const editor = event.editor;
		const tab = {
			viewColumn: editorGroupToColumn(this._editorGroupsService, event.groupId),
			label: editor.getName(),
			resource: editor instanceof SideBySideEditorInput ? EditorResourceAccessor.getCanonicalUri(editor, { supportSideBySide: SideBySideEditor.PRIMARY }) : EditorResourceAccessor.getCanonicalUri(editor),
			editorId: editor.editorId,
			isActive: (this._editorGroupsService.activeGroup.id === event.groupId) && this._editorGroupsService.activeGroup.isActive(editor)
		};
		this._tabModel.get(event.groupId)?.splice(event.editorIndex, 0, tab);
		// Update the currently active tab which may or may not be the opened one
		if (tab.isActive) {
			if (this._currentlyActiveTab) {
				this._currentlyActiveTab.isActive = (this._editorGroupsService.activeGroup.id === event.groupId) && this._editorGroupsService.activeGroup.isActive({ resource: URI.revive(this._currentlyActiveTab.resource), editorId: this._currentlyActiveTab.editorId });
			}
			this._currentlyActiveTab = tab;
		}
	}

	private _onDidTabClose(event: IEditorChangeEvent): void {
		if (event.kind !== GroupChangeKind.EDITOR_CLOSE || !event.editorIndex) {
			return;
		}
		this._tabModel.get(event.groupId)?.splice(event.editorIndex, 1);

		// Go to the active group and update the active tab
		const activeGroupId = this._editorGroupsService.activeGroup.id;
		this._tabModel.get(activeGroupId)?.forEach(t => {
			if (t.resource) {
				t.isActive = (this._editorGroupsService.activeGroup.id === event.groupId) && this._editorGroupsService.activeGroup.isActive({ resource: URI.revive(t.resource), editorId: t.editorId });
			}
			if (t.isActive) {
				if (this._currentlyActiveTab) {
					this._currentlyActiveTab.isActive = (this._editorGroupsService.activeGroup.id === event.groupId) && this._editorGroupsService.activeGroup.isActive({ resource: URI.revive(this._currentlyActiveTab.resource), editorId: this._currentlyActiveTab.editorId });
				}
				this._currentlyActiveTab = t;
			}
		}, this);
	}

	private _updateTabsModel(event: IEditorChangeEvent): void {

		switch (event.kind) {
			case GroupChangeKind.EDITOR_OPEN:
				this._onDidTabOpen(event);
				break;
			case GroupChangeKind.EDITOR_CLOSE:
				this._onDidTabClose(event);
				break;
			default:
				break;
		}
	}
}
