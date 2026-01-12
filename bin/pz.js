#!/usr/bin/env node

const { program } = require('commander');
const chalk = require('chalk');
const packageJson = require('../package.json');

// Import commands
const authCommands = require('../src/commands/auth');
const pasteCommands = require('../src/commands/paste');
const secretsCommands = require('../src/commands/secrets');
const runCommands = require('../src/commands/run');
const pasteboxCommands = require('../src/commands/pastebox');
const { getConfig } = require('../src/config');

// CLI Header
console.log(chalk.gray(`
  ╔═══════════════════════════════════╗
  ║  ${chalk.green.bold('Pastezen CLI')} ${chalk.gray('v' + packageJson.version)}            ║
  ║  ${chalk.gray('Secure code sharing & secrets')}     ║
  ╚═══════════════════════════════════╝
`));

program
    .name('pz')
    .description('Pastezen CLI - secure code sharing & secrets management')
    .version(packageJson.version);

// Auth commands
const auth = program.command('auth').description('Authentication commands');
auth.command('login')
    .description('Interactive login')
    .action(authCommands.login);
auth.command('token <token>')
    .description('Set API token directly')
    .action(authCommands.setToken);
auth.command('logout')
    .description('Clear credentials')
    .action(authCommands.logout);
auth.command('status')
    .description('Show authentication status')
    .action(authCommands.status);

// Paste commands
program.command('push <files...>')
    .description('Push file(s) as a paste')
    .option('-t, --title <title>', 'Paste title')
    .option('-p, --private', 'Make paste private')
    .option('--password', 'Password protect the paste')
    .option('-e, --expire <duration>', 'Expiration time (e.g., 1h, 1d, 1w)')
    .action(pasteCommands.push);

program.command('pull <pasteId>')
    .description('Download a paste')
    .option('-o, --output <path>', 'Output file path')
    .option('--password <password>', 'Password for protected pastes')
    .action(pasteCommands.pull);

program.command('list')
    .alias('ls')
    .description('List your pastes')
    .option('-n, --limit <n>', 'Limit results', '20')
    .action(pasteCommands.list);

program.command('view <pasteId>')
    .description('View paste content')
    .option('--password <password>', 'Password for protected pastes')
    .action(pasteCommands.view);

program.command('delete <pasteId>')
    .alias('rm')
    .description('Delete a paste')
    .action(pasteCommands.delete);

// Secrets commands
const secrets = program.command('secrets').description('Secrets management');
secrets.command('list')
    .description('List secret projects')
    .action(secretsCommands.list);
secrets.command('create <name>')
    .description('Create a new secret project')
    .option('--public', 'Create as public (no password)')
    .action(secretsCommands.create);
secrets.command('view <id>')
    .description('View secrets in a project')
    .option('--password <password>', 'Password for private projects')
    .action(secretsCommands.view);
secrets.command('set <id> <keyValue>')
    .description('Set a key-value pair (KEY=value)')
    .option('--password <password>', 'Password for private projects')
    .action(secretsCommands.set);
secrets.command('get <id> <key>')
    .description('Get a specific key value')
    .option('--password <password>', 'Password for private projects')
    .action(secretsCommands.get);
secrets.command('delete <id>')
    .description('Delete a secret project')
    .action(secretsCommands.delete);
secrets.command('export <id>')
    .description('Export secrets as .env format')
    .option('--password <password>', 'Password for private projects')
    .option('-o, --output <file>', 'Output file path')
    .action(secretsCommands.exportEnv);
secrets.command('import <id> <file>')
    .description('Import secrets from .env file')
    .option('--password <password>', 'Password for private projects')
    .action(secretsCommands.importEnv);

// Pastebox commands
const pastebox = program.command('pastebox').description('Manage Pasteboxes (isolated environments)');
pastebox.command('create <name>')
    .description('Create a new Pastebox')
    .option('--ssh-auth <method>', 'SSH auth method: password, publickey, both')
    .option('--ssh-key <key>', 'SSH public key for auth')
    .option('--key-name <name>', 'Name for the SSH key')
    .option('--storage <mb>', 'Storage limit in MB')
    .option('--memory <mb>', 'Memory limit in MB')
    .action(pasteboxCommands.create);

pastebox.command('list')
    .description('List your Pasteboxes')
    .option('--json', 'Output as JSON')
    .option('--table', 'Output as table')
    .action(pasteboxCommands.list);

pastebox.command('inspect <id>')
    .alias('get')
    .description('Show Pastebox details')
    .option('--json', 'Output as JSON')
    .action(pasteboxCommands.inspect);

pastebox.command('delete <id>')
    .description('Delete a Pastebox')
    .option('-f, --force', 'Skip confirmation')
    .action(pasteboxCommands.delete);

pastebox.command('ssh <id>')
    .description('Connect to Pastebox via SSH')
    .action(pasteboxCommands.ssh);

pastebox.command('ssh-info <id>')
    .description('Show SSH connection details')
    .action(pasteboxCommands.sshInfo);

pastebox.command('files <id> [path]')
    .description('List files in Pastebox')
    .action(pasteboxCommands.files);

pastebox.command('upload <id> <src> [dst]')
    .description('Upload file to Pastebox')
    .option('-r, --recursive', 'Upload directory recursively')
    .action(pasteboxCommands.upload);

pastebox.command('download <id> <src> [dst]')
    .description('Download file from Pastebox')
    .option('-r, --recursive', 'Download directory recursively')
    .action(pasteboxCommands.download);

pastebox.command('secrets <id>')
    .description('Manage Pastebox secrets')
    .option('--list', 'List injected secrets')
    .option('--set <KEY=value>', 'Inject a secret')
    .option('--env-file <file>', 'Import secrets from .env file')
    .action(pasteboxCommands.secrets);

// Run command
program.command('run <target>')
    .description('Execute code remotely')
    .option('-l, --lang <language>', 'Language for local files')
    .action(runCommands.run);

// Config command
program.command('config')
    .description('Show configuration')
    .option('--set <key=value>', 'Set a config value')
    .action((options) => {
        if (options.set) {
            const [key, value] = options.set.split('=');
            const { setConfigValue } = require('../src/config');
            setConfigValue(key, value);
            console.log(chalk.green(`✓ Set ${key} = ${value}`));
        } else {
            const config = getConfig();
            console.log(chalk.bold('\nConfiguration:'));
            console.log(JSON.stringify(config, null, 2));
        }
    });

program.parse();

