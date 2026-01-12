const chalk = require('chalk');
const ora = require('ora');
const api = require('../api');
const { readFile, getLanguageFromExtension, toBase64 } = require('../utils');

async function run(target, options) {
    const spinner = ora('Executing code...').start();

    try {
        let pasteId = target;

        // Check if target is a local file
        try {
            const content = readFile(target);
            const language = options.lang || getLanguageFromExtension(target);

            // Create temporary paste and execute
            spinner.text = 'Creating temporary paste...';

            const paste = await api.createPaste({
                title: `CLI Execution: ${target}`,
                files: [{
                    name: target,
                    content: toBase64(content),
                    language
                }],
                visibility: 'private',
                expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString() // 5 min expiry
            });

            pasteId = paste._id;
            spinner.text = 'Executing...';
        } catch (e) {
            // Not a file, treat as paste ID
        }

        // Execute
        const result = await api.executePaste(pasteId);

        spinner.succeed('Execution complete');
        console.log('');

        if (result.stdout) {
            console.log(chalk.bold('Output:'));
            console.log(result.stdout);
        }

        if (result.stderr) {
            console.log(chalk.bold.yellow('Stderr:'));
            console.log(result.stderr);
        }

        if (result.error) {
            console.log(chalk.bold.red('Error:'));
            console.log(result.error);
        }

        console.log('');
        console.log(chalk.gray(`Exit code: ${result.exitCode || 0}`));
        console.log(chalk.gray(`Time: ${result.time || 'N/A'}ms`));

    } catch (error) {
        spinner.fail('Execution failed');
        console.error(chalk.red(error.response?.data?.message || error.message));
        process.exit(1);
    }
}

module.exports = {
    run
};
