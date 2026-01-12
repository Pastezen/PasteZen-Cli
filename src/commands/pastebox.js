const chalk = require('chalk');
const ora = require('ora');
const fs = require('fs');
const path = require('path');
const api = require('../api');
const { spawn } = require('child_process');

// Create pastebox
async function create(name, options) {
    const spinner = ora('Creating pastebox...').start();

    try {
        const data = { name };

        if (options.sshAuth) {
            data.sshAuthMethod = options.sshAuth;
        }
        if (options.sshKey) {
            data.sshPublicKey = options.sshKey;
        }
        if (options.keyName) {
            data.sshKeyName = options.keyName;
        }
        if (options.storage) {
            data.storageMB = parseInt(options.storage);
        }
        if (options.memory) {
            data.memoryMB = parseInt(options.memory);
        }

        const result = await api.createPastebox(data);
        spinner.succeed('Pastebox created successfully!');

        console.log(chalk.bold('\n📦 Pastebox Details:'));
        console.log(chalk.gray('─'.repeat(40)));
        console.log(`  ${chalk.cyan('ID:')}      ${result._id || result.id}`);
        console.log(`  ${chalk.cyan('Name:')}    ${result.name}`);
        console.log(`  ${chalk.cyan('Status:')}  ${chalk.green(result.status || 'running')}`);

        if (result.sshPassword) {
            console.log(chalk.yellow('\n🔐 SSH Credentials (save these!):'));
            console.log(`  ${chalk.cyan('User:')}     ${result._id || result.id}`);
            console.log(`  ${chalk.cyan('Password:')} ${result.sshPassword}`);
            console.log(`  ${chalk.cyan('Host:')}     ssh.pastezen.com`);
            console.log(`  ${chalk.cyan('Port:')}     2222`);
        }

        console.log(chalk.gray('\n─'.repeat(40)));
        console.log(chalk.gray(`Connect: pz pastebox ssh ${result._id || result.id}`));

    } catch (error) {
        spinner.fail('Failed to create pastebox');
        console.error(chalk.red(error.response?.data?.message || error.message));
        process.exit(1);
    }
}

// List pasteboxes
async function list(options) {
    const spinner = ora('Fetching pasteboxes...').start();

    try {
        const boxes = await api.listPasteboxes();
        spinner.stop();

        if (!boxes || boxes.length === 0) {
            console.log(chalk.yellow('No pasteboxes found. Create one with: pz pastebox create <name>'));
            return;
        }

        if (options.json) {
            console.log(JSON.stringify(boxes, null, 2));
            return;
        }

        console.log(chalk.bold(`\n📦 Your Pasteboxes (${boxes.length}):\n`));

        boxes.forEach((box, i) => {
            const status = box.status === 'running' ? chalk.green('●') : chalk.red('●');
            console.log(`  ${status} ${chalk.cyan(box.name)} ${chalk.gray('(' + (box._id || box.id) + ')')}`);
            console.log(`    ${chalk.gray('Created:')} ${new Date(box.createdAt).toLocaleDateString()}`);
            if (box.sshAuthMethods) {
                console.log(`    ${chalk.gray('SSH Auth:')} ${box.sshAuthMethods.join(', ')}`);
            }
            if (i < boxes.length - 1) console.log();
        });

    } catch (error) {
        spinner.fail('Failed to fetch pasteboxes');
        console.error(chalk.red(error.response?.data?.message || error.message));
        process.exit(1);
    }
}

// Inspect pastebox
async function inspect(id, options) {
    const spinner = ora('Fetching pastebox details...').start();

    try {
        const box = await api.getPastebox(id);
        spinner.stop();

        if (options.json) {
            console.log(JSON.stringify(box, null, 2));
            return;
        }

        console.log(chalk.bold('\n📦 Pastebox Details:\n'));
        console.log(`  ${chalk.cyan('ID:')}          ${box._id || box.id}`);
        console.log(`  ${chalk.cyan('Name:')}        ${box.name}`);
        console.log(`  ${chalk.cyan('Status:')}      ${box.status === 'running' ? chalk.green('running') : chalk.red(box.status)}`);
        console.log(`  ${chalk.cyan('Created:')}     ${new Date(box.createdAt).toLocaleString()}`);

        if (box.sshAuthMethods) {
            console.log(`  ${chalk.cyan('SSH Auth:')}    ${box.sshAuthMethods.join(', ')}`);
        }
        if (box.storageMB) {
            console.log(`  ${chalk.cyan('Storage:')}     ${box.storageMB} MB`);
        }
        if (box.memoryMB) {
            console.log(`  ${chalk.cyan('Memory:')}      ${box.memoryMB} MB`);
        }

        console.log(chalk.gray('\n─'.repeat(40)));
        console.log(chalk.gray(`SSH: pz pastebox ssh ${box._id || box.id}`));

    } catch (error) {
        spinner.fail('Failed to fetch pastebox');
        console.error(chalk.red(error.response?.data?.message || error.message));
        process.exit(1);
    }
}

// Delete pastebox
async function deletePastebox(id, options) {
    if (!options.force) {
        const inquirer = require('inquirer');
        const { confirm } = await inquirer.prompt([{
            type: 'confirm',
            name: 'confirm',
            message: `Are you sure you want to delete pastebox ${id}? This cannot be undone.`,
            default: false
        }]);

        if (!confirm) {
            console.log(chalk.yellow('Cancelled.'));
            return;
        }
    }

    const spinner = ora('Deleting pastebox...').start();

    try {
        await api.deletePastebox(id);
        spinner.succeed('Pastebox deleted successfully');
    } catch (error) {
        spinner.fail('Failed to delete pastebox');
        console.error(chalk.red(error.response?.data?.message || error.message));
        process.exit(1);
    }
}

// SSH connect
async function ssh(id) {
    const spinner = ora('Getting SSH connection info...').start();

    try {
        const box = await api.getPastebox(id);
        spinner.stop();

        const sshHost = 'ssh.pastezen.com';
        const sshPort = 2222;
        const sshUser = box._id || box.id;

        console.log(chalk.cyan(`\n🔗 Connecting to ${box.name}...`));
        console.log(chalk.gray(`   ssh -p ${sshPort} ${sshUser}@${sshHost}\n`));

        // Spawn SSH process
        const sshProcess = spawn('ssh', ['-p', sshPort.toString(), `${sshUser}@${sshHost}`], {
            stdio: 'inherit'
        });

        sshProcess.on('error', (err) => {
            console.error(chalk.red('Failed to start SSH:', err.message));
            console.log(chalk.yellow(`\nManual command: ssh -p ${sshPort} ${sshUser}@${sshHost}`));
        });

    } catch (error) {
        spinner.fail('Failed to connect');
        console.error(chalk.red(error.response?.data?.message || error.message));
        process.exit(1);
    }
}

// SSH info
async function sshInfo(id) {
    const spinner = ora('Getting SSH info...').start();

    try {
        const box = await api.getPastebox(id);
        spinner.stop();

        const boxId = box._id || box.id;

        console.log(chalk.bold('\n🔐 SSH Connection Details:\n'));
        console.log(`  ${chalk.cyan('Host:')}     ssh.pastezen.com`);
        console.log(`  ${chalk.cyan('Port:')}     2222`);
        console.log(`  ${chalk.cyan('User:')}     ${boxId}`);
        console.log(`  ${chalk.cyan('Auth:')}     ${(box.sshAuthMethods || ['password']).join(', ')}`);

        console.log(chalk.bold('\n📋 Commands:\n'));
        console.log(`  ${chalk.gray('SSH:')}   ssh -p 2222 ${boxId}@ssh.pastezen.com`);
        console.log(`  ${chalk.gray('SFTP:')}  sftp -P 2222 ${boxId}@ssh.pastezen.com`);
        console.log(`  ${chalk.gray('SCP:')}   scp -P 2222 file.txt ${boxId}@ssh.pastezen.com:~/`);

    } catch (error) {
        spinner.fail('Failed to get SSH info');
        console.error(chalk.red(error.response?.data?.message || error.message));
        process.exit(1);
    }
}

// List files
async function files(id, remotePath = '/') {
    const spinner = ora('Listing files...').start();

    try {
        const fileList = await api.listPasteboxFiles(id, remotePath);
        spinner.stop();

        console.log(chalk.bold(`\n📁 Files in ${remotePath}:\n`));

        if (!fileList || fileList.length === 0) {
            console.log(chalk.gray('  (empty directory)'));
            return;
        }

        fileList.forEach(f => {
            const icon = f.type === 'dir' ? '📁' : '📄';
            const name = f.type === 'dir' ? chalk.cyan(f.name + '/') : f.name;
            const size = f.size ? chalk.gray(`(${formatBytes(f.size)})`) : '';
            console.log(`  ${icon} ${name} ${size}`);
        });

    } catch (error) {
        spinner.fail('Failed to list files');
        console.error(chalk.red(error.response?.data?.message || error.message));
        process.exit(1);
    }
}

// Upload file
async function upload(id, src, dst, options) {
    const spinner = ora(`Uploading ${src}...`).start();

    try {
        if (!fs.existsSync(src)) {
            spinner.fail(`File not found: ${src}`);
            process.exit(1);
        }

        const content = fs.readFileSync(src);
        const base64Content = content.toString('base64');
        const remotePath = dst || '/' + path.basename(src);

        await api.uploadPasteboxFile(id, remotePath, base64Content);
        spinner.succeed(`Uploaded ${src} → ${remotePath}`);

    } catch (error) {
        spinner.fail('Failed to upload file');
        console.error(chalk.red(error.response?.data?.message || error.message));
        process.exit(1);
    }
}

// Download file
async function download(id, src, dst) {
    const spinner = ora(`Downloading ${src}...`).start();

    try {
        const data = await api.downloadPasteboxFile(id, src);
        const outputPath = dst || path.basename(src);

        if (data.content) {
            const content = Buffer.from(data.content, 'base64');
            fs.writeFileSync(outputPath, content);
        } else {
            fs.writeFileSync(outputPath, data);
        }

        spinner.succeed(`Downloaded ${src} → ${outputPath}`);

    } catch (error) {
        spinner.fail('Failed to download file');
        console.error(chalk.red(error.response?.data?.message || error.message));
        process.exit(1);
    }
}

// Manage secrets
async function secrets(id, options) {
    if (options.list) {
        const spinner = ora('Listing secrets...').start();
        try {
            const secretList = await api.listPasteboxSecrets(id);
            spinner.stop();

            console.log(chalk.bold('\n🔐 Injected Secrets:\n'));
            if (!secretList || secretList.length === 0) {
                console.log(chalk.gray('  No secrets injected'));
                return;
            }
            secretList.forEach(s => {
                console.log(`  • ${chalk.cyan(s.key)} ${chalk.gray('(encrypted)')}`);
            });
        } catch (error) {
            spinner.fail('Failed to list secrets');
            console.error(chalk.red(error.response?.data?.message || error.message));
        }
        return;
    }

    if (options.set) {
        const spinner = ora('Injecting secret...').start();
        try {
            const [key, ...valueParts] = options.set.split('=');
            const value = valueParts.join('=');
            const secrets = { [key]: value };

            await api.injectPasteboxSecrets(id, secrets);
            spinner.succeed(`Secret ${key} injected`);
        } catch (error) {
            spinner.fail('Failed to inject secret');
            console.error(chalk.red(error.response?.data?.message || error.message));
        }
        return;
    }

    if (options.envFile) {
        const spinner = ora(`Importing secrets from ${options.envFile}...`).start();
        try {
            if (!fs.existsSync(options.envFile)) {
                spinner.fail(`File not found: ${options.envFile}`);
                process.exit(1);
            }

            const content = fs.readFileSync(options.envFile, 'utf-8');
            const secrets = {};

            content.split('\n').forEach(line => {
                line = line.trim();
                if (line && !line.startsWith('#')) {
                    const [key, ...valueParts] = line.split('=');
                    if (key && valueParts.length) {
                        secrets[key.trim()] = valueParts.join('=').trim();
                    }
                }
            });

            const count = Object.keys(secrets).length;
            await api.injectPasteboxSecrets(id, secrets);
            spinner.succeed(`Injected ${count} secrets from ${options.envFile}`);
        } catch (error) {
            spinner.fail('Failed to import secrets');
            console.error(chalk.red(error.response?.data?.message || error.message));
        }
        return;
    }

    // Default: show usage
    console.log(chalk.bold('\n🔐 Pastebox Secrets Commands:\n'));
    console.log(`  ${chalk.cyan('pz pastebox secrets <id> --list')}         List injected secrets`);
    console.log(`  ${chalk.cyan('pz pastebox secrets <id> --set KEY=val')}  Inject a secret`);
    console.log(`  ${chalk.cyan('pz pastebox secrets <id> --env-file .env')} Import from .env file`);
}

// Helper: format bytes
function formatBytes(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

module.exports = {
    create,
    list,
    inspect,
    delete: deletePastebox,
    ssh,
    sshInfo,
    files,
    upload,
    download,
    secrets
};
