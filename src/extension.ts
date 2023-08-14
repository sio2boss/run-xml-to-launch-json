import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as xml2js from 'xml2js';
import { ExtensionContext, window, commands, ProgressLocation } from 'vscode';


function replacePaths(arg: string) {
	arg = arg.replace("$PROJECT_DIR$", "${workspaceFolder}");
	if (arg.charAt(0) === '"' && arg.charAt(arg.length-1) == '"') {
		arg = arg.replace(/"/g, "");
	}
	return arg;
}

export function activate(context: ExtensionContext) {
	context.subscriptions.push(commands.registerCommand('extension.startTask', () => {

		window.withProgress({
			location: ProgressLocation.Notification,
			title: "RX2LJ",
			cancellable: true
		}, async function(progress, token) {

			token.onCancellationRequested(() => {
				console.log("User canceled the conversion process");
			});

			// Find all run.xml files
			progress.report({ increment: 0, message: "Loading all run.xml files..." });
			const workspaceDir: string | undefined = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
			if (!workspaceDir) return;

			// Read all the run.xml files
			const runmap = new Map<string, any>();
			const folderUri: vscode.Uri = vscode.Uri.file(path.join(workspaceDir, '.run'));
			for (const [name, type] of await vscode.workspace.fs.readDirectory(folderUri)) {
				const content = fs.readFileSync(path.join(workspaceDir, '.run', name), 'utf-8');
				const parser = new xml2js.Parser();
				parser.parseString(content, (err, result) => {
					runmap.set(name, result);
				});
			}

			// Read or create launch.json to memory
			progress.report({ increment: 25, message: "Reading existing launch.json..." });
			const vscodeDirectory = path.join(workspaceDir, ".vscode");
			if (!fs.existsSync(vscodeDirectory)) {
				fs.mkdirSync(vscodeDirectory);
			}
			const launchfile = path.join(workspaceDir, '.vscode', 'launch.json');
			let launch: any = {};
			const launchConfigurations = new Map<string, any>();
			if (!fs.existsSync(launchfile)) {
				launch = {
					"version": "0.2.0",
					"configurations": []
				};

			} else {
				launch = JSON.parse(fs.readFileSync(launchfile, 'utf-8'));
				for (const l of launch['configurations']) {
					launchConfigurations.set(l['name'], l);	
				}
			}

			// Convert
			progress.report({ increment: 50, message: "Converting..." });
			for (const [name, run] of runmap) {
				const config = run.component.configuration[0];
				const typeOfLaunch = String(config['$'].type).toLowerCase();
				const factoryName = String(config['$'].factoryName).toLowerCase();
				const l: any = {
					"name": config['$'].name,
					"type": factoryName,
					"request": "launch",
					"console": "integratedTerminal",
					"args": []
				};
				if (typeOfLaunch === 'tests') {
					const module = typeOfLaunch;
					if (factoryName === 'unittests') {
						l['module'] = 'unittest';
					} else {
						l['module'] = module;
					}
					l['type'] = 'python';
					l['args'].push('discover');
				}
				if (typeOfLaunch === 'js.build_tools.npm') {
					continue;
					// console.log(config['command'][0]['$'].value);
					// l['command'] = 'npm ' + config['command'][0]['$'].value;
					// l['type'] = 'node-terminal';
				}
				config.option?.forEach((config: any) => {
					if (config['$'].name === 'WORKING_DIRECTORY') {
						l['cwd'] = replacePaths(config['$'].value);
					}
					if (config['$'].name === 'SCRIPT_NAME') {
						let module = replacePaths(config['$'].value);
						if (module.endsWith(".py")) {
							module = config['$'].value;
							module = module.replace(".py", "");
							module = module.replace(/\//g, '.');
							module = module.replace("$PROJECT_DIR$.", "");
							l['module'] = module;
						} else {
							l['module'] = replacePaths(config['$'].value);
						}
					}
					if (config['$'].name === 'PARAMETERS') {
						const param = replacePaths(config['$'].value);
						if (param.length > 0) {
							l['args'].push(param);
						}
					}
					if (config['$'].name === '_new_target') {
						l['args'].push('-s');
						l['args'].push(replacePaths(config['$'].value));
					}
				});

				const envs = new Map<string, string>();
				config?.envs[0]?.env?.forEach((env: any) => {
					envs.set(env['$'].name, env['$'].value);
				});
				l['env'] = Object.fromEntries(envs);
				launchConfigurations.set(config['$'].name, l);
			}
			launch['configurations'] = Array.from(launchConfigurations.values());

			// Write launch.json
			progress.report({ increment: 99, message: "Writing updated launch.json..." });
			fs.writeFileSync(launchfile, JSON.stringify(launch, null, 4));

			// Resolve promise
			const p = new Promise<void>(resolve => {
				resolve();
			});

			return p;
			
		});

	}));
}
