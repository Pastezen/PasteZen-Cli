const chalk = require('chalk');
const ora = require('ora');
const inquirer = require('inquirer');
const path = require('path');
const api = require('../api');
const { toBase64, fromBase64, encryptContent, decryptContent } = require('../crypto');
const {
    readFile,
    writeFile,
    getLanguageFromExtension,
    formatPaste,
    parseExpiration
} = require('../utils');

async function push(files, options) {
    const spinner = ora('Preparing paste...').start();

    try {
        // Read all files
        const fileContents = files.map(filePath => {
            const content = readFile(filePath);
            const filename = path.basename(filePath);
            const language = getLanguageFromExtension(filename);

            return {
                name: filename,
                content: toBase64(content),
                language
            };
        });

        // Prepare paste data
        const pasteData = {
            title: options.title || files[0],
            files: fileContents,
            visibility: options.private ? 'private' : 'public'
        };

        // Handle password protection
        if (options.password) {
            spinner.text = 'Setting up encryption...';

            const { password } = await inquirer.prompt([
                {
                    type: 'password',
                    name: 'password',
                    message: 'Enter password for encryption:',
                    mask: '*'
                }
            ]);

            const { confirmPassword } = await inquirer.prompt([
                {
                    type: 'password',
                    name: 'confirmPassword',
                    message: 'Confirm password:',
                    mask: '*'
                }
            ]);

            if (password !== confirmPassword) {
                spinner.fail('Passwords do not match');
                process.exit(1);
            }

            pasteData.isPasswordProtected = true;
            pasteData.password = password;
        }

        // Handle expiration
        if (options.expire) {
            const expireDate = parseExpiration(options.expire);
            if (expireDate) {
                pasteData.expiresAt = expireDate.toISOString();
            }
        }

        spinner.text = 'Uploading paste...';
        const result = await api.createPaste(pasteData);

        spinner.succeed('Paste created successfully!');
        console.log('');
        console.log(chalk.bold('  Paste ID: ') + chalk.cyan(result._id));
        console.log(chalk.bold('  URL: ') + chalk.blue(`https://pastezen.com/pastes/${result._id}`));
        console.log('');

    } catch (error) {
        spinner.fail('Failed to create paste');
        console.error(chalk.red(error.response?.data?.message || error.message));
        process.exit(1);
    }
}

async function pull(pasteId, options) {
    const spinner = ora('Fetching paste...').start();

    try {
        let paste;

        try {
            paste = await api.getPaste(pasteId);
        } catch (error) {
            if (error.response?.status === 403) {
                spinner.stop();

                let password = options.password;
                if (!password) {
                    const answer = await inquirer.prompt([
                        {
                            type: 'password',
                            name: 'password',
                            message: 'This paste is password protected. Enter password:',
                            mask: '*'
                        }
                    ]);
                    password = answer.password;
                }

                spinner.start('Unlocking paste...');
                paste = await api.getPaste(pasteId, password);
            } else {
                throw error;
            }
        }

        spinner.succeed('Paste retrieved!');

        // Save files
        for (const file of paste.files || []) {
            // Content is returned as plain text from API, not base64
            const content = file.content;
            const outputPath = options.output || file.name;

            writeFile(outputPath, content);
            console.log(chalk.green(`  ✓ Saved: ${outputPath}`));
        }

    } catch (error) {
        spinner.fail('Failed to fetch paste');
        console.error(chalk.red(error.response?.data?.message || error.message));
        process.exit(1);
    }
}

async function list(options) {
    const spinner = ora('Fetching pastes...').start();

    try {
        const pastes = await api.listPastes();

        spinner.succeed(`Found ${pastes.length} pastes`);
        console.log('');

        const limit = parseInt(options.limit) || 20;
        const displayPastes = pastes.slice(0, limit);

        if (displayPastes.length === 0) {
            console.log(chalk.gray('  No pastes found. Create one with `pz push <file>`'));
            return;
        }

        displayPastes.forEach(paste => {
            console.log('  ' + formatPaste(paste));
        });

        if (pastes.length > limit) {
            console.log(chalk.gray(`\n  ... and ${pastes.length - limit} more`));
        }
        console.log('');

    } catch (error) {
        spinner.fail('Failed to list pastes');
        console.error(chalk.red(error.response?.data?.message || error.message));
        process.exit(1);
    }
}

async function view(pasteId, options) {
    const spinner = ora('Fetching paste...').start();

    try {
        let paste;

        try {
            paste = await api.getPaste(pasteId);
        } catch (error) {
            if (error.response?.status === 403) {
                spinner.stop();

                let password = options.password;
                if (!password) {
                    const answer = await inquirer.prompt([
                        {
                            type: 'password',
                            name: 'password',
                            message: 'Enter password:',
                            mask: '*'
                        }
                    ]);
                    password = answer.password;
                }

                spinner.start('Unlocking...');
                paste = await api.getPaste(pasteId, password);
            } else {
                throw error;
            }
        }

        spinner.succeed(paste.title || 'Untitled');
        console.log('');

        for (const file of paste.files || []) {
            console.log(chalk.bold.cyan(`── ${file.name} ──`));
            // Content is returned as plain text from API, not base64
            console.log(file.content);
            console.log('');
        }

    } catch (error) {
        spinner.fail('Failed to view paste');
        console.error(chalk.red(error.response?.data?.message || error.message));
        process.exit(1);
    }
}

async function deletePaste(pasteId) {
    const { confirm } = await inquirer.prompt([
        {
            type: 'confirm',
            name: 'confirm',
            message: `Delete paste ${pasteId}?`,
            default: false
        }
    ]);

    if (!confirm) {
        console.log(chalk.gray('Cancelled.'));
        return;
    }

    const spinner = ora('Deleting paste...').start();

    try {
        await api.deletePaste(pasteId);
        spinner.succeed('Paste deleted');
    } catch (error) {
        spinner.fail('Failed to delete paste');
        console.error(chalk.red(error.response?.data?.message || error.message));
        process.exit(1);
    }
}

module.exports = {
    push,
    pull,
    list,
    view,
    delete: deletePaste
};
