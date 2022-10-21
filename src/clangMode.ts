import * as vscode from 'vscode';
import { availableLanguages, clangFormatLangEnabled } from './config';

export const MODES: vscode.DocumentFilter[] = availableLanguages
  .filter(clangFormatLangEnabled)
  .map(language => ({language, scheme: 'file'}));
