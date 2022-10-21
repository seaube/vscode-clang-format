import * as vscode from 'vscode';
import {spawn} from 'child_process';
import * as path from 'path';
import {getBinPath} from './clangPath';
import * as sax from 'sax';
import { availableLanguages, clangFormatConfig, clangFormatExecutable } from './config';

export let outputChannel = vscode.window.createOutputChannel('ClangFormat');

export class ClangDocumentFormattingEditProvider implements vscode.DocumentFormattingEditProvider, vscode.DocumentRangeFormattingEditProvider {
  public async provideDocumentFormattingEdits(document: vscode.TextDocument, options: vscode.FormattingOptions, token: vscode.CancellationToken) {
    return await this.doFormatDocument(document, null, token) || [];
  }

  public async provideDocumentRangeFormattingEdits(document: vscode.TextDocument, range: vscode.Range, options: vscode.FormattingOptions, token: vscode.CancellationToken) {
    return await this.doFormatDocument(document, range, token) || [];
  }

  private getEdits(document: vscode.TextDocument, xml: string, codeContent: string): Thenable<vscode.TextEdit[]> {
    return new Promise((resolve, reject) => {
      let options = {
        trim: false,
        normalize: false,
        loose: true
      };
      let parser = sax.parser(true, options);

      let edits: vscode.TextEdit[] = [];
      let currentEdit: { length: number, offset: number, text: string }|null = null;

      let codeBuffer = Buffer.from(codeContent);
      // encoding position cache
      let codeByteOffsetCache = {
        byte: 0,
        offset: 0
      };
      let byteToOffset = function(editInfo: { length: number, offset: number }) {
        let offset = editInfo.offset;
        let length = editInfo.length;

        if (offset >= codeByteOffsetCache.byte) {
          editInfo.offset = codeByteOffsetCache.offset + codeBuffer.slice(codeByteOffsetCache.byte, offset).toString('utf8').length;
          codeByteOffsetCache.byte = offset;
          codeByteOffsetCache.offset = editInfo.offset;
        } else {
          editInfo.offset = codeBuffer.slice(0, offset).toString('utf8').length;
          codeByteOffsetCache.byte = offset;
          codeByteOffsetCache.offset = editInfo.offset;
        }

        editInfo.length = codeBuffer.slice(offset, offset + length).toString('utf8').length;

        return editInfo;
      };

      parser.onerror = (err) => {
        reject(err.message);
      };

      parser.onopentag = (tag) => {
        if (currentEdit) {
          reject('Malformed output');
        }

        switch (tag.name) {
        case 'replacements':
          return;

        case 'replacement':
          currentEdit = {
            length: parseInt(tag.attributes['length'].toString()),
            offset: parseInt(tag.attributes['offset'].toString()),
            text: ''
          };
          byteToOffset(currentEdit);
          break;

        default:
          reject(`Unexpected tag ${tag.name}`);
        }

      };

      parser.ontext = (text) => {
        if (!currentEdit) { return; }

        currentEdit.text = text;
      };

      parser.onclosetag = (tagName) => {
        if (!currentEdit) { return; }

        let start = document.positionAt(currentEdit.offset);
        let end = document.positionAt(currentEdit.offset + currentEdit.length);

        let editRange = new vscode.Range(start, end);

        edits.push(new vscode.TextEdit(editRange, currentEdit.text));
        currentEdit = null;
      };

      parser.onend = () => {
        resolve(edits);
      };

      parser.write(xml);
      parser.end();

    });
  }

  /// Get execute name in clangformat.executable, if not found, use default value
  /// If configure has changed, it will get the new value
  private getExecutablePath() {
    return clangFormatExecutable()
      .replace(/\${workspaceFolder}/g, this.getWorkspaceFolder() || '')
      .replace(/\${cwd}/g, process.cwd())
      .replace(/\${env\.([^}]+)}/g, (sub: string, envName: string) => process.env[envName] || '');
  }

  private getAssumedFilename(document: vscode.TextDocument) {
    const assumedFilename = clangFormatConfig('assumeFilename');
    if (!assumedFilename) {
      return document.fileName;
    }
    let parsedPath = path.parse(document.fileName);
    let fileNoExtension = path.join(parsedPath.dir, parsedPath.name);
    return assumedFilename
        .replace(/\${file}/g, document.fileName)
        .replace(/\${fileNoExtension}/g, fileNoExtension)
        .replace(/\${fileBasename}/g, parsedPath.base)
        .replace(/\${fileBasenameNoExtension}/g, parsedPath.name)
        .replace(/\${fileExtname}/g, parsedPath.ext);
  }

  private getWorkspaceFolder(): string|undefined {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage("Unable to get the location of clang-format executable - no active workspace selected");
      return undefined;
    }

    if (!vscode.workspace.workspaceFolders) {
      vscode.window.showErrorMessage("Unable to get the location of clang-format executable - no workspaces available");
      return undefined
    }

    const currentDocumentUri = editor.document.uri
    let workspacePath = vscode.workspace.getWorkspaceFolder(currentDocumentUri);
    if (!workspacePath) {
      const fallbackWorkspace = vscode.workspace.workspaceFolders[0];
      vscode.window.showWarningMessage(`Unable to deduce the location of clang-format executable for file outside the workspace - expanding \${workspaceFolder} to '${fallbackWorkspace.name}' path`);
      workspacePath = fallbackWorkspace;
    }
    return workspacePath.uri.path;
  }

  private doFormatDocument(document: vscode.TextDocument, range: vscode.Range|null = null, token: vscode.CancellationToken|null = null): Thenable<vscode.TextEdit[]|null> {
    return new Promise((resolve, reject) => {
      let formatCommandBinPath = getBinPath(this.getExecutablePath());
      let codeContent = document.getText();

      let formatArgs = [
        '-output-replacements-xml',
        `-style=${clangFormatConfig('style')}`,
        `-fallback-style=${clangFormatConfig('fallbackStyle')}`,
        `-assume-filename=${this.getAssumedFilename(document)}`
      ];

      if (range) {
        let offset = document.offsetAt(range.start);
        let length = document.offsetAt(range.end) - offset;

        // fix charater length to byte length
        length = Buffer.byteLength(codeContent.substr(offset, length), 'utf8');
        // fix charater offset to byte offset
        offset = Buffer.byteLength(codeContent.substr(0, offset), 'utf8');

        formatArgs.push(`-offset=${offset}`, `-length=${length}`);
      }

      let workingPath = vscode.workspace.rootPath;
      if (!document.isUntitled) {
        workingPath = path.dirname(document.fileName);
      }

      let stdout = '';
      let stderr = '';
      let child = spawn(formatCommandBinPath, formatArgs, { cwd: workingPath });
      child.stdin.end(codeContent);
      child.stdout.on('data', chunk => stdout += chunk);
      child.stderr.on('data', chunk => stderr += chunk);
      child.on('error', err => {
        if (err && (<any>err).code === 'ENOENT') {
          vscode.window.showInformationMessage('The \'' + formatCommandBinPath + '\' command is not available.  Please check your clang-format.executable user setting and ensure it is installed.');
          return resolve(null);
        }
        return reject(err);
      });
      child.on('close', async code => {
        try {
          if (stderr.length != 0) {
            outputChannel.show();
            outputChannel.clear();
            outputChannel.appendLine(stderr);
            return reject('Cannot format due to syntax errors.');
          }

          if (code != 0) {
            return reject();
          }

          resolve(await this.getEdits(document, stdout, codeContent));
        } catch (e) {
          reject(e);
        }
      });

      if (token) {
        token.onCancellationRequested(() => {
          child.kill();
          reject('Cancelation requested');
        });
      }
    });
  }

  public formatDocument(document: vscode.TextDocument): Thenable<vscode.TextEdit[]|null> {
    return this.doFormatDocument(document);
  }
}

export function activate(ctx: vscode.ExtensionContext): void {
  const formatter = new ClangDocumentFormattingEditProvider();

  for(const language of availableLanguages) {
    const selector = {language, scheme: 'file'};
    ctx.subscriptions.push(vscode.languages.registerDocumentRangeFormattingEditProvider(selector, formatter));
    ctx.subscriptions.push(vscode.languages.registerDocumentFormattingEditProvider(selector, formatter));
  }
}
