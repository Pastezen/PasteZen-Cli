const chalk = require('chalk');
const ora = require('ora');
const inquirer = require('inquirer');
const api = require('../api');
const { encryptContent, decryptContent, toBase64, fromBase64 } = require('../crypto');
const {
    formatSecret,
    readFile,
    writeFile,
    parseKeyValue,
    parseEnvFile,
    toEnvFormat
} = require('../utils');

async function list() {
    const spinner = ora('Fetching secret projects...').start();

    try {
        const secrets = await api.listSecrets();

        spinner.succeed(`Found ${secrets.length} secret projects`);
        console.log('');

        if (secrets.length === 0) {
            console.log(chalk.gray('  No secret projects found. Create one with `pz secrets create <name>`'));
            return;
        }

        secrets.forEach(secret => {
            console.log('  ' + formatSecret(secret));
        });
        console.log('');

    } catch (error) {
        spinner.fail('Failed to list secrets');
        console.error(chalk.red(error.response?.data?.message || error.message));
        process.exit(1);
    }
}

async function create(name, options) {
    const spinner = ora('Creating secret project...').start();

    try {
        const visibility = options.public ? 'public' : 'private';
        let password = null;

        if (!options.public) {
            spinner.stop();

            const answers = await inquirer.prompt([
                {
                    type: 'password',
                    name: 'password',
                    message: 'Enter encryption password:',
                    mask: '*'
                },
                {
                    type: 'password',
                    name: 'confirmPassword',
                    message: 'Confirm password:',
                    mask: '*'
                }
            ]);

            if (answers.password !== answers.confirmPassword) {
                console.log(chalk.red('Passwords do not match'));
                process.exit(1);
            }

            password = answers.password;
            spinner.start('Creating secret project...');
        }

        // Backend requires at least one secret - create an initial placeholder
        let secrets;
        if (visibility === 'public') {
            secrets = [{ key: '_init', value: 'initialized' }];
        } else {
            // For private, encrypt the placeholder
            const encrypted = encryptContent('initialized', password);
            secrets = [{
                key: '_init',
                value: encrypted.ciphertext,
                salt: encrypted.salt,
                iv: encrypted.iv
            }];
        }

        const secretData = {
            projectName: name,
            visibility,
            password: password,
            secrets: secrets
        };

        const result = await api.createSecret(secretData);

        spinner.succeed('Secret project created!');
        console.log('');
        console.log(chalk.bold('  Project ID: ') + chalk.cyan(result._id));
        console.log(chalk.bold('  Name: ') + result.projectName);
        console.log(chalk.bold('  Visibility: ') + (options.public ? chalk.blue('public') : chalk.red('private')));
        console.log('');

    } catch (error) {
        spinner.fail('Failed to create secret project');
        console.error(chalk.red(error.response?.data?.message || error.message));
        process.exit(1);
    }
}

// Helper to parse secrets array into key-value object
function parseSecretsArray(secretsArray, visibility, password) {
    const data = {};
    if (!secretsArray || !Array.isArray(secretsArray)) return data;

    for (const item of secretsArray) {
        if (!item.key || item.key === '_init') continue; // Skip init placeholder

        if (visibility === 'public') {
            data[item.key] = item.value;
        } else if (password) {
            try {
                const decrypted = decryptContent({
                    ciphertext: item.value,
                    salt: item.salt,
                    iv: item.iv
                }, password);
                data[item.key] = decrypted;
            } catch (e) {
                // If decryption fails, use raw value
                data[item.key] = item.value;
            }
        }
    }
    return data;
}

async function view(id, options) {
    const spinner = ora('Fetching secrets...').start();

    try {
        let secret;
        let password = options.password;

        try {
            secret = await api.getSecret(id);
        } catch (error) {
            if (error.response?.status === 403) {
                spinner.stop();

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

                spinner.start('Decrypting...');
                secret = await api.getSecret(id, password);
            } else {
                throw error;
            }
        }

        spinner.succeed(secret.projectName);
        console.log('');

        // Parse secrets array
        const data = parseSecretsArray(secret.secrets, secret.visibility, password);
        const keys = Object.keys(data);

        if (keys.length === 0) {
            console.log(chalk.gray('  No secrets stored yet. Add with `pz secrets set <id> KEY=value`'));
        } else {
            keys.forEach(key => {
                console.log(`  ${chalk.cyan(key)}=${chalk.gray(data[key])}`);
            });
        }
        console.log('');

    } catch (error) {
        spinner.fail('Failed to fetch secrets');
        console.error(chalk.red(error.response?.data?.message || error.message));
        process.exit(1);
    }
}

async function set(id, keyValue, options) {
    const spinner = ora('Updating secret...').start();

    try {
        const { key, value } = parseKeyValue(keyValue);

        // Get current secrets
        let secret;
        let password = options.password;

        try {
            secret = await api.getSecret(id);
        } catch (error) {
            if (error.response?.status === 403) {
                spinner.stop();

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

                spinner.start('Updating...');
                secret = await api.getSecret(id, password);
            } else {
                throw error;
            }
        }

        // Build new secrets array
        let newSecrets = secret.secrets ? [...secret.secrets] : [];

        // Remove existing key if present (and init placeholder)
        newSecrets = newSecrets.filter(s => s.key !== key && s.key !== '_init');

        // Add new secret
        if (secret.visibility === 'public') {
            newSecrets.push({ key, value });
        } else {
            const encrypted = encryptContent(value, password);
            newSecrets.push({
                key,
                value: encrypted.ciphertext,
                salt: encrypted.salt,
                iv: encrypted.iv
            });
        }

        await api.updateSecret(id, { secrets: newSecrets });

        spinner.succeed(`Set ${chalk.cyan(key)}`);

    } catch (error) {
        spinner.fail('Failed to set secret');
        console.error(chalk.red(error.response?.data?.message || error.message));
        process.exit(1);
    }
}

async function get(id, key, options) {
    const spinner = ora('Fetching secret...').start();

    try {
        let secret;
        let password = options.password;

        try {
            secret = await api.getSecret(id);
        } catch (error) {
            if (error.response?.status === 403) {
                spinner.stop();

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

                spinner.start('Decrypting...');
                secret = await api.getSecret(id, password);
            } else {
                throw error;
            }
        }

        spinner.stop();

        // Find the key in secrets array
        const data = parseSecretsArray(secret.secrets, secret.visibility, password);

        if (data[key] !== undefined) {
            console.log(data[key]);
        } else {
            console.log(chalk.red(`Key '${key}' not found`));
            process.exit(1);
        }

    } catch (error) {
        spinner.fail('Failed to get secret');
        console.error(chalk.red(error.response?.data?.message || error.message));
        process.exit(1);
    }
}

async function deleteSecret(id) {
    const { confirm } = await inquirer.prompt([
        {
            type: 'confirm',
            name: 'confirm',
            message: `Delete secret project ${id}?`,
            default: false
        }
    ]);

    if (!confirm) {
        console.log(chalk.gray('Cancelled.'));
        return;
    }

    const spinner = ora('Deleting...').start();

    try {
        await api.deleteSecret(id);
        spinner.succeed('Secret project deleted');
    } catch (error) {
        spinner.fail('Failed to delete');
        console.error(chalk.red(error.response?.data?.message || error.message));
        process.exit(1);
    }
}

async function exportEnv(id, options) {
    const spinner = ora('Exporting secrets...').start();

    try {
        let secret;
        let password = options.password;

        try {
            secret = await api.getSecret(id);
        } catch (error) {
            if (error.response?.status === 403) {
                spinner.stop();

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

                spinner.start('Decrypting...');
                secret = await api.getSecret(id, password);
            } else {
                throw error;
            }
        }

        // Parse secrets array
        const data = parseSecretsArray(secret.secrets, secret.visibility, password);
        const envContent = toEnvFormat(data);

        if (options.output) {
            writeFile(options.output, envContent);
            spinner.succeed(`Exported to ${options.output}`);
        } else {
            spinner.succeed('Exported secrets:');
            console.log('');
            console.log(envContent || chalk.gray('(no secrets)'));
        }

    } catch (error) {
        spinner.fail('Failed to export');
        console.error(chalk.red(error.response?.data?.message || error.message));
        process.exit(1);
    }
}

async function importEnv(id, file, options) {
    const spinner = ora('Importing secrets...').start();

    try {
        // Read .env file
        const content = readFile(file);
        const newData = parseEnvFile(content);

        let secret;
        let password = options.password;

        try {
            secret = await api.getSecret(id);
        } catch (error) {
            if (error.response?.status === 403) {
                spinner.stop();

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

                spinner.start('Importing...');
                secret = await api.getSecret(id, password);
            } else {
                throw error;
            }
        }

        // Get existing secrets (excluding init placeholder)
        let existingSecrets = (secret.secrets || []).filter(s => s.key !== '_init');

        // Build new secrets array with merged data
        const existingKeys = existingSecrets.map(s => s.key);

        for (const [key, value] of Object.entries(newData)) {
            // Remove if exists
            existingSecrets = existingSecrets.filter(s => s.key !== key);

            // Add new
            if (secret.visibility === 'public') {
                existingSecrets.push({ key, value });
            } else {
                const encrypted = encryptContent(value, password);
                existingSecrets.push({
                    key,
                    value: encrypted.ciphertext,
                    salt: encrypted.salt,
                    iv: encrypted.iv
                });
            }
        }

        await api.updateSecret(id, { secrets: existingSecrets });

        spinner.succeed(`Imported ${Object.keys(newData).length} secrets`);

    } catch (error) {
        spinner.fail('Failed to import');
        console.error(chalk.red(error.response?.data?.message || error.message));
        process.exit(1);
    }
}

module.exports = {
    list,
    create,
    view,
    set,
    get,
    delete: deleteSecret,
    exportEnv,
    importEnv
};
