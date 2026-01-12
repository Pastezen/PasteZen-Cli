const chalk = require('chalk');
const inquirer = require('inquirer');
const { setToken, clearToken, getToken, getConfig } = require('../config');

async function login() {
    console.log(chalk.yellow('Interactive login not yet supported.'));
    console.log(chalk.gray('Please use `pz auth token <TOKEN>` with your API token.'));
    console.log(chalk.gray('Get your token from: https://pastezen.com/tokens'));
}

async function setTokenCommand(token) {
    if (!token || token.length < 10) {
        console.log(chalk.red('Error: Invalid token format.'));
        process.exit(1);
    }

    setToken(token);
    console.log(chalk.green('✓ API token saved successfully!'));
    console.log(chalk.gray('Your token is stored in ~/.pastezen/config.json'));
}

async function logout() {
    const { confirm } = await inquirer.prompt([
        {
            type: 'confirm',
            name: 'confirm',
            message: 'Are you sure you want to logout?',
            default: false
        }
    ]);

    if (confirm) {
        clearToken();
        console.log(chalk.green('✓ Logged out successfully.'));
    } else {
        console.log(chalk.gray('Cancelled.'));
    }
}

async function status() {
    const token = getToken();
    const config = getConfig();

    console.log(chalk.bold('\nAuthentication Status:'));
    console.log('─'.repeat(40));

    if (token) {
        const maskedToken = token.substring(0, 8) + '...' + token.substring(token.length - 4);
        console.log(chalk.green('✓ Authenticated'));
        console.log(chalk.gray(`  Token: ${maskedToken}`));
    } else {
        console.log(chalk.red('✗ Not authenticated'));
        console.log(chalk.gray('  Run `pz auth token <TOKEN>` to authenticate'));
    }

    console.log(chalk.gray(`  API URL: ${config.apiUrl}`));
}

module.exports = {
    login,
    setToken: setTokenCommand,
    logout,
    status
};
