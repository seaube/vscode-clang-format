import * as vscode from 'vscode';

const aliases: {[lang: string]: string|undefined} = {
  'proto3': 'proto',
};

// keep sorted
export const availableLanguages: ReadonlyArray<string> = [
  'apex',
  'c',
  'cpp',
  'csharp',
  'cuda-cpp',
  'cuda',
  'glsl',
  'hlsl',
  'java',
  'javascript',
  'json',
  'objective-c',
  'objective-cpp',
  'proto',
  'proto3',
  'textproto',
  'typescript',
];

const defaultConfig = {
  executable: 'clang-format',
  style: 'file',
  fallbackStyle: 'none',
  assumeFilename: '',
};

function langConfigName(lang: string): string {
  return aliases[lang] || lang;
}

function platformString() {
  switch(process.platform) {
    case 'win32': return 'windows';
    case 'linux': return 'linux';
    case 'darwin': return 'macos';
  }

  return 'unknown';
}

export type ClangFormatConfigKey = keyof typeof defaultConfig;

export function clangFormatLangConfig(lang: string, key: ClangFormatConfigKey): string {
  const config = vscode.workspace.getConfiguration('clangformat');

  let strConf = config.get<string>(`language.${langConfigName(lang)}.${key}`);
  if (strConf && strConf.trim()) {
    return strConf;
  }

  strConf = config.get<string>(key);
  if (strConf && strConf.trim()) {
    return strConf;
  }

  return defaultConfig[key];
}

export function clangFormatConfig(key: ClangFormatConfigKey): string {
  const config = vscode.workspace.getConfiguration('clangformat');
  const platformStr = platformString();

  return config.get<string>(`${key}.${platformStr}`) || config.get<string>(`${key}`) || defaultConfig[key];
}
