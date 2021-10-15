/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { URI } from 'vs/base/common/uri';
import * as nls from 'vs/nls';
import * as Paths from 'vs/base/common/path';
import * as resources from 'vs/base/common/resources';
import * as Json from 'vs/base/common/json';
import { ExtensionData, IThemeExtensionPoint, IWorkbenchFileIconTheme } from 'vs/workbench/services/themes/common/workbenchThemeService';
import { IFileService } from 'vs/platform/files/common/files';
import { getParseErrorMessage } from 'vs/base/common/jsonErrorMessages';
import { asCSSPropertyValue, asCSSUrl } from 'vs/base/browser/dom';
import { IStorageService, StorageScope, StorageTarget } from 'vs/platform/storage/common/storage';
import { IModeService } from 'vs/editor/common/services/modeService';
import { getIconRegistry, IconContribution } from 'vs/platform/theme/common/iconRegistry';

export class FileIconThemeData implements IWorkbenchFileIconTheme {

	static readonly STORAGE_KEY = 'iconThemeData';

	id: string;
	label: string;
	settingsId: string | null;
	description?: string;
	hasFileIcons: boolean;
	hasFolderIcons: boolean;
	hidesExplorerArrows: boolean;
	isLoaded: boolean;
	location?: URI;
	extensionData?: ExtensionData;
	watch?: boolean;

	styleSheetContent?: string;

	private constructor(id: string, label: string, settingsId: string | null) {
		this.id = id;
		this.label = label;
		this.settingsId = settingsId;
		this.isLoaded = false;
		this.hasFileIcons = false;
		this.hasFolderIcons = false;
		this.hidesExplorerArrows = false;
	}

	public ensureLoaded(themeLoader: FileIconThemeLoader): Promise<string | undefined> {
		return !this.isLoaded ? this.load(themeLoader) : Promise.resolve(this.styleSheetContent);
	}

	public reload(themeLoader: FileIconThemeLoader): Promise<string | undefined> {
		return this.load(themeLoader);
	}

	private load(themeLoader: FileIconThemeLoader): Promise<string | undefined> {
		return themeLoader.load(this);
	}

	static fromExtensionTheme(iconTheme: IThemeExtensionPoint, iconThemeLocation: URI, extensionData: ExtensionData): FileIconThemeData {
		const id = extensionData.extensionId + '-' + iconTheme.id;
		const label = iconTheme.label || Paths.basename(iconTheme.path);
		const settingsId = iconTheme.id;

		const themeData = new FileIconThemeData(id, label, settingsId);

		themeData.description = iconTheme.description;
		themeData.location = iconThemeLocation;
		themeData.extensionData = extensionData;
		themeData.watch = iconTheme._watch;
		themeData.isLoaded = false;
		return themeData;
	}

	private static _noIconTheme: FileIconThemeData | null = null;

	static get noIconTheme(): FileIconThemeData {
		let themeData = FileIconThemeData._noIconTheme;
		if (!themeData) {
			themeData = FileIconThemeData._noIconTheme = new FileIconThemeData('', '', null);
			themeData.hasFileIcons = false;
			themeData.hasFolderIcons = false;
			themeData.hidesExplorerArrows = false;
			themeData.isLoaded = true;
			themeData.extensionData = undefined;
			themeData.watch = false;
		}
		return themeData;
	}

	static createUnloadedTheme(id: string): FileIconThemeData {
		const themeData = new FileIconThemeData(id, '', '__' + id);
		themeData.isLoaded = false;
		themeData.hasFileIcons = false;
		themeData.hasFolderIcons = false;
		themeData.hidesExplorerArrows = false;
		themeData.extensionData = undefined;
		themeData.watch = false;
		return themeData;
	}


	static fromStorageData(storageService: IStorageService): FileIconThemeData | undefined {
		const input = storageService.get(FileIconThemeData.STORAGE_KEY, StorageScope.GLOBAL);
		if (!input) {
			return undefined;
		}
		try {
			let data = JSON.parse(input);
			const theme = new FileIconThemeData('', '', null);
			for (let key in data) {
				switch (key) {
					case 'id':
					case 'label':
					case 'description':
					case 'settingsId':
					case 'styleSheetContent':
					case 'hasFileIcons':
					case 'hidesExplorerArrows':
					case 'hasFolderIcons':
					case 'watch':
						(theme as any)[key] = data[key];
						break;
					case 'location':
						// ignore, no longer restore
						break;
					case 'extensionData':
						theme.extensionData = ExtensionData.fromJSONObject(data.extensionData);
						break;
				}
			}
			return theme;
		} catch (e) {
			return undefined;
		}
	}

	toStorage(storageService: IStorageService) {
		const data = JSON.stringify({
			id: this.id,
			label: this.label,
			description: this.description,
			settingsId: this.settingsId,
			styleSheetContent: this.styleSheetContent,
			hasFileIcons: this.hasFileIcons,
			hasFolderIcons: this.hasFolderIcons,
			hidesExplorerArrows: this.hidesExplorerArrows,
			extensionData: ExtensionData.toJSONObject(this.extensionData),
			watch: this.watch
		});
		storageService.store(FileIconThemeData.STORAGE_KEY, data, StorageScope.GLOBAL, StorageTarget.MACHINE);
	}
}

interface IconDefinition {
	iconPath: string;
	fontColor: string;
	fontCharacter: string;
	fontSize: string;
	fontId: string;
}

interface FontDefinition {
	id: string;
	weight: string;
	style: string;
	size: string;
	src: { path: string; format: string; }[];
}

interface IconsAssociation {
	folder?: string;
	file?: string;
	folderExpanded?: string;
	rootFolder?: string;
	rootFolderExpanded?: string;
	folderNames?: { [folderName: string]: string; };
	folderNamesExpanded?: { [folderName: string]: string; };
	fileExtensions?: { [extension: string]: string; };
	fileNames?: { [fileName: string]: string; };
	languageIds?: { [languageId: string]: string; };
}

interface IconThemeDocument extends IconsAssociation {
	iconDefinitions: { [key: string]: IconDefinition };
	fonts: FontDefinition[];
	light?: IconsAssociation;
	highContrast?: IconsAssociation;
	hidesExplorerArrows?: boolean;
	showLanguageModeIcons?: boolean;
}

export class FileIconThemeLoader {

	constructor(
		private readonly fileService: IFileService,
		private readonly modeService: IModeService
	) {
	}

	public load(data: FileIconThemeData): Promise<string | undefined> {
		if (!data.location) {
			return Promise.resolve(data.styleSheetContent);
		}
		return this.loadIconThemeDocument(data.location).then(iconThemeDocument => {
			const result = this.processIconThemeDocument(data.id, data.location!, iconThemeDocument);
			data.styleSheetContent = result.content;
			data.hasFileIcons = result.hasFileIcons;
			data.hasFolderIcons = result.hasFolderIcons;
			data.hidesExplorerArrows = result.hidesExplorerArrows;
			data.isLoaded = true;
			return data.styleSheetContent;
		});
	}

	private loadIconThemeDocument(location: URI): Promise<IconThemeDocument> {
		return this.fileService.readFile(location).then((content) => {
			let errors: Json.ParseError[] = [];
			let contentValue = Json.parse(content.value.toString(), errors);
			if (errors.length > 0) {
				return Promise.reject(new Error(nls.localize('error.cannotparseicontheme', "Problems parsing file icons file: {0}", errors.map(e => getParseErrorMessage(e.error)).join(', '))));
			} else if (Json.getNodeType(contentValue) !== 'object') {
				return Promise.reject(new Error(nls.localize('error.invalidformat', "Invalid format for file icons theme file: Object expected.")));
			}
			return Promise.resolve(contentValue);
		});
	}

	private processIconThemeDocument(id: string, iconThemeDocumentLocation: URI, iconThemeDocument: IconThemeDocument): { content: string; hasFileIcons: boolean; hasFolderIcons: boolean; hidesExplorerArrows: boolean; } {

		const result = { content: '', hasFileIcons: false, hasFolderIcons: false, hidesExplorerArrows: !!iconThemeDocument.hidesExplorerArrows };

		if (!iconThemeDocument.iconDefinitions) {
			return result;
		}
		const selectorByDefinitionId: { [def: string]: string[] } = {};
		const coveredLanguages: { [languageId: string]: boolean } = {};

		const iconThemeDocumentLocationDirname = resources.dirname(iconThemeDocumentLocation);
		function resolvePath(path: string) {
			return resources.joinPath(iconThemeDocumentLocationDirname, path);
		}

		function collectSelectors(associations: IconsAssociation | undefined, baseThemeClassName?: string) {
			function addSelector(selector: string, defId: string) {
				if (defId) {
					let list = selectorByDefinitionId[defId];
					if (!list) {
						list = selectorByDefinitionId[defId] = [];
					}
					list.push(selector);
				}
			}

			if (associations) {
				let qualifier = '.show-file-icons';
				if (baseThemeClassName) {
					qualifier = baseThemeClassName + ' ' + qualifier;
				}

				const expanded = '.monaco-tl-twistie.collapsible:not(.collapsed) + .monaco-tl-contents';

				if (associations.folder) {
					addSelector(`${qualifier} .folder-icon::before`, associations.folder);
					result.hasFolderIcons = true;
				}

				if (associations.folderExpanded) {
					addSelector(`${qualifier} ${expanded} .folder-icon::before`, associations.folderExpanded);
					result.hasFolderIcons = true;
				}

				let rootFolder = associations.rootFolder || associations.folder;
				let rootFolderExpanded = associations.rootFolderExpanded || associations.folderExpanded;

				if (rootFolder) {
					addSelector(`${qualifier} .rootfolder-icon::before`, rootFolder);
					result.hasFolderIcons = true;
				}

				if (rootFolderExpanded) {
					addSelector(`${qualifier} ${expanded} .rootfolder-icon::before`, rootFolderExpanded);
					result.hasFolderIcons = true;
				}

				if (associations.file) {
					addSelector(`${qualifier} .file-icon::before`, associations.file);
					result.hasFileIcons = true;
				}

				let folderNames = associations.folderNames;
				if (folderNames) {
					for (let folderName in folderNames) {
						addSelector(`${qualifier} .${escapeCSS(folderName.toLowerCase())}-name-folder-icon.folder-icon::before`, folderNames[folderName]);
						result.hasFolderIcons = true;
					}
				}
				let folderNamesExpanded = associations.folderNamesExpanded;
				if (folderNamesExpanded) {
					for (let folderName in folderNamesExpanded) {
						addSelector(`${qualifier} ${expanded} .${escapeCSS(folderName.toLowerCase())}-name-folder-icon.folder-icon::before`, folderNamesExpanded[folderName]);
						result.hasFolderIcons = true;
					}
				}

				let languageIds = associations.languageIds;
				if (languageIds) {
					if (!languageIds.jsonc && languageIds.json) {
						languageIds.jsonc = languageIds.json;
					}
					for (let languageId in languageIds) {
						addSelector(`${qualifier} .${escapeCSS(languageId)}-lang-file-icon.file-icon::before`, languageIds[languageId]);
						result.hasFileIcons = true;
						coveredLanguages[languageId] = true;
					}
				}
				let fileExtensions = associations.fileExtensions;
				if (fileExtensions) {
					for (let fileExtension in fileExtensions) {
						let selectors: string[] = [];
						let segments = fileExtension.toLowerCase().split('.');
						if (segments.length) {
							for (let i = 0; i < segments.length; i++) {
								selectors.push(`.${escapeCSS(segments.slice(i).join('.'))}-ext-file-icon`);
							}
							selectors.push('.ext-file-icon'); // extra segment to increase file-ext score
						}
						addSelector(`${qualifier} ${selectors.join('')}.file-icon::before`, fileExtensions[fileExtension]);
						result.hasFileIcons = true;
					}
				}
				let fileNames = associations.fileNames;
				if (fileNames) {
					for (let fileName in fileNames) {
						let selectors: string[] = [];
						fileName = fileName.toLowerCase();
						selectors.push(`.${escapeCSS(fileName)}-name-file-icon`);
						let segments = fileName.split('.');
						if (segments.length) {
							for (let i = 1; i < segments.length; i++) {
								selectors.push(`.${escapeCSS(segments.slice(i).join('.'))}-ext-file-icon`);
							}
							selectors.push('.ext-file-icon'); // extra segment to increase file-ext score
						}
						addSelector(`${qualifier} ${selectors.join('')}.file-icon::before`, fileNames[fileName]);
						result.hasFileIcons = true;
					}
				}
			}
		}
		collectSelectors(iconThemeDocument);
		collectSelectors(iconThemeDocument.light, '.vs');
		collectSelectors(iconThemeDocument.highContrast, '.hc-black');

		if (!result.hasFileIcons && !result.hasFolderIcons) {
			return result;
		}

		let cssRules: string[] = [];

		let fonts = iconThemeDocument.fonts;
		if (Array.isArray(fonts)) {
			fonts.forEach(font => {
				let src = font.src.map(l => `${asCSSUrl(resolvePath(l.path))} format('${l.format}')`).join(', ');
				cssRules.push(`@font-face { src: ${src}; font-family: '${font.id}'; font-weight: ${font.weight}; font-style: ${font.style}; font-display: block; }`);
			});
			cssRules.push(`.show-file-icons .file-icon::before, .show-file-icons .folder-icon::before, .show-file-icons .rootfolder-icon::before { font-family: '${fonts[0].id}'; font-size: ${fonts[0].size || '150%'}; }`);
		}

		for (let defId in selectorByDefinitionId) {
			let selectors = selectorByDefinitionId[defId];
			let definition = iconThemeDocument.iconDefinitions[defId];
			if (definition) {
				if (definition.iconPath) {
					cssRules.push(`${selectors.join(', ')} { content: ' '; background-image: ${asCSSUrl(resolvePath(definition.iconPath))}; }`);
				}
				if (definition.fontCharacter || definition.fontColor) {
					let body = '';
					if (definition.fontColor) {
						body += ` color: ${definition.fontColor};`;
					}
					if (definition.fontCharacter) {
						body += ` content: '${definition.fontCharacter}';`;
					}
					if (definition.fontSize) {
						body += ` font-size: ${definition.fontSize};`;
					}
					if (definition.fontId) {
						body += ` font-family: ${definition.fontId};`;
					}
					else if (Array.isArray(fonts)) {
						body += ` font-family: ${fonts[0].id};`;
					}
					cssRules.push(`${selectors.join(', ')} { ${body} }`);
				}
			}
		}

		if (iconThemeDocument.showLanguageModeIcons === true || (result.hasFileIcons && iconThemeDocument.showLanguageModeIcons !== false)) {
			const iconRegistry = getIconRegistry();
			for (const languageId of this.modeService.getRegisteredModes()) {
				if (!coveredLanguages[languageId]) {
					const iconName = this.modeService.getIconForMode(languageId);
					if (iconName) {
						const iconContribution = iconRegistry.getIcon(iconName.id);
						if (iconContribution) {
							const definition = IconContribution.getDefinition(iconContribution, iconRegistry);
							if (definition) {
								const content = definition.fontCharacter;
								const fontFamily = asCSSPropertyValue(definition.fontId ?? 'codicon');
								cssRules.push(`.show-file-icons .${escapeCSS(languageId)}-lang-file-icon.file-icon::before { content: '${content}'; font-family: ${fontFamily}; font-size: 16px; background-image: none };`);
							}
						}
					}
				}
			}
		}

		result.content = cssRules.join('\n');
		return result;
	}

}

function escapeCSS(str: string) {
	str = str.replace(/[\11\12\14\15\40]/g, '/'); // HTML class names can not contain certain whitespace characters, use / instead, which doesn't exist in file names.
	return window.CSS.escape(str);
}
