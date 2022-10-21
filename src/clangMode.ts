import * as vscode from 'vscode';

const aliases: {[lang: string]: string|undefined} = {
  'proto3': 'proto',
};
const availableLanguages = ['cpp', 'c', 'csharp', 'objective-c', 'objective-cpp', 'java', 'javascript', 'typescript', 'proto', 'proto3', 'apex', 'glsl', 'hlsl', 'cuda', 'cuda-cpp',];

export function langConfigName(lang: string): string {
  return aliases[lang] || lang;
}

let languages: string[] = [];
for (let l of availableLanguages) {
  let confKey = `language.${langConfigName(l)}.enable`;
  if (vscode.workspace.getConfiguration('clang-format').get(confKey)) {
    languages.push(l);
  }
}

export const MODES: vscode.DocumentFilter[] = languages.map((language) => ({language, scheme: 'file'}));
