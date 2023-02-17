/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Emitter, Event } from 'vs/base/common/event';

class TabFocusImpl {
	private _tabFocusTerminal: boolean = false;
	private _tabFocusEditor: boolean = false;

	private readonly _onDidChangeTabFocus = new Emitter<boolean>();
	public readonly onDidChangeTabFocus: Event<boolean> = this._onDidChangeTabFocus.event;

	public getTabFocusMode(context: 'terminal' | 'editor'): boolean {
		return context === 'terminal' ? this._tabFocusTerminal : this._tabFocusEditor;
	}

	public setTabFocusMode(tabFocusMode: boolean, context: 'terminal' | 'editor'): void {
		if ((context === 'terminal' && this._tabFocusTerminal === tabFocusMode) || (context === 'editor' && this._tabFocusEditor === tabFocusMode)) {
			return;
		}
		if (context === 'terminal') {
			this._tabFocusTerminal = tabFocusMode;
		} else {
			this._tabFocusEditor = tabFocusMode;
		}
		this._onDidChangeTabFocus.fire(this._tabFocusTerminal);
	}
}

/**
 * Control what pressing Tab does.
 * If it is false, pressing Tab or Shift-Tab will be handled by the editor.
 * If it is true, pressing Tab or Shift-Tab will move the browser focus.
 * Defaults to false.
 */
export const TabFocus = new TabFocusImpl();
