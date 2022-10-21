import * as vscode from 'vscode';

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

function platformString() {
  switch(process.platform) {
    case 'win32': return 'windows';
    case 'linux': return 'linux';
    case 'darwin': return 'macos';
  }

  return 'unknown';
}

export type ClangFormatConfigKey = keyof typeof defaultConfig;

export function clangFormatExecutable(): string {
  const config = vscode.workspace.getConfiguration('clangFormat');
  const platformStr = platformString();

  return config.get<string>(`executable.${platformStr}`) || config.get<string>(`executable.default`) || defaultConfig.executable;
}


export function clangFormatConfig(key: ClangFormatConfigKey): string;
export function clangFormatConfig(key: 'executable'): never;
export function clangFormatConfig(key: ClangFormatConfigKey): string {
  const config = vscode.workspace.getConfiguration('clangFormat');
  return config.get<string>(key) || defaultConfig[key];
}
