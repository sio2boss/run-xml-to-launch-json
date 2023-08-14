# run-xml-to-launch-json

This is a simple extension for VSCode to migrate IntelliJ style .run/*.run.xml files into .vscode/launch.json entries.  The opposite is not supporated at this time.

Based on https://github.com/microsoft/vscode-extension-samples/tree/main/progress-sample

## Usage

On MacOS: Cmd-Shift-P, 'RX2LJ: Convert run.xml files to launch.json'

All *.run.xml files within .run/ folder will be converted into entries in launch.json

Cmd-Shift-D to show "Run and Debug" sidebar.

## How to run locally

* `npm run compile` to start the compiler in watch mode
* open this folder in VS Code and press `F5`
