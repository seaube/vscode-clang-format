# ClangFormat for Visual Studio Code

This is a fork of [xaverh/vscode-clang-format](https://github.com/xaverh/vscode-clang-format) which hasn't published a new version since **2019** at the time of writing this. See issue: [xaverh/vscode-clang-format#113](https://github.com/xaverh/vscode-clang-format/issues/113). Most of the changes are cleanup/modernizing the codebase.

Notable differences:

* Extension settings are under the `clangformat` scope. This is partly to make this extension not collide with [xaverh/vscode-clang-format](https://github.com/xaverh/vscode-clang-format) and to match the extension name which cannot be `clang-format` due to [microsoft/vscode-docs#5584](https://github.com/microsoft/vscode-docs/issues/5584).
* `clangformat.{language}.*` settings are removed. Instead we recommend using [Language Specific Editor Settings](https://code.visualstudio.com/docs/getstarted/settings#_language-specific-editor-settings).
* More languages supported

This extension allows you to format your code with [Clang-Format](http://clang.llvm.org/docs/ClangFormat.html). It can be configured with a config file named `.clang-format` within the working folder or a parent folder. Configuration see: <http://clang.llvm.org/docs/ClangFormatStyleOptions.html>

## Usage

Files can be formatted on-demand by right clicking in the document and selecting "Format Document", or by using the associated keyboard shortcut (usually `Ctrl`+`⇧`+`F` on Windows, `Ctrl`+`⇧`+`I` on Linux, and `⇧`+`⌥`+`F` on macOS).

To automatically format a file on save, add the following to your
vscode `settings.json` file:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "seaube.clangformat"
}
```

If you would like to only use ClangFormat for a specify language use [Language Specific Editor Settings](https://code.visualstudio.com/docs/getstarted/settings#_language-specific-editor-settings).

```json
{
  "editor.formatOnSave": true,
  "[cpp]": {
    "editor.defaultFormatter": "seaube.clangformat"
  }
}
```

## Specifying the location of clang-format

This extension will attempt to find clang-format on your `PATH`. Alternatively, the clang-format executable can be specified in your vscode settings.json file:

```json
{
  "clangformat.executable": "/absolute/path/to/clang-format"
}
```

Additionally you may specify a different path for different platforms.

```json
{
  "clangformat.executable.windows": "/absolute/path/to/clang-format.exe",
  "clangformat.executable.linux": "/absolute/path/to/clang-format",
  "clangformat.executable.macos": "/absolute/path/to/clang-format",
}
```

Substitutions can also be used in the `clang-format.executable` value.
The following substitutions are supported:

* `${workspaceFolder}` - replaced by the absolute path of the current vscode workspace. In case of outside-workspace files `${workspaceFolder}` expands to the absolute path of the first available workspace.
* `${cwd}` - replaced by the current working directory of vscode.
* `${env.VAR}` - replaced by the environment variable VAR, e.g. `${env.HOME}` will be replaced by `$HOME`, your home directory.

Substitutions are also supported in `clang-format.assumeFilename`. The supported
substitutions are `${file}`, `${fileNoExtension}`, `${fileBasename}`,
`${fileBasenameNoExtension}`, and `${fileExtname}`, with the same meaning as the
predefined variables in [other configuration files](https://code.visualstudio.com/docs/editor/variables-reference).

For example:

* `${fileNoExtension}.cpp` - `/home/src/foo.h` will be formatted with `-assume-filename /home/src/foo.cpp`.

## Source code

Available on github: <https://github.com/seaube/vscode-clang-format>
