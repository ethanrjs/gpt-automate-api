const openai = require('openai');
const configuration = new openai.Configuration({
    organization: 'org-5SQeLQ8rfWqdoiHmo77XPzir',
    apiKey: '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'
});
const openapi = new openai.OpenAIApi(configuration);
const chalk = require('chalk');
const { getOptimizedData } = require('./tokenPartition.js');

// Prompt Iteration: 23
const PRE_PROMPT = `
Convert user prompts into one of these 10 commands, without extra text:

'NEW_FILE "path/to/file.txt"'
'NEW_FOLDER "path/to/folder"'
'DEL_PATH "file.txt"'
'WRITE_TO_FILE "path/to/file.txt" "content"'
'EXECUTE_COMMAND "shell_command"'
'INVALID_REQUEST "reason"'
'MOV_PATH "path/to/file_or_folder.txt" "path/to/new/file_or_folder.txt"'
'APPEND_TO_FILE "path/to/file.txt" "content"'
'RFC "path/to/file.txt"'
'OPEN_FILE_AT_LINE lineNumber "path/to/file.txt"'

Follow guidelines:

- Strictly use the 10 command formats.
- Add and separate commands with "~."
- Create folders recursively.
- Assume suitable names if not given.
- Prefix paths with ./.
- Don't add single quotes or escape them.
- Preserve code formatting, don't minify.
- DEL_PATH and MOV_PATH work for files and folders.
- Use only the 10 specified commands with arguments in quotes.
- Reply with commands, no explanations.
- For RFC, use only RFC, no other commands.
- Every command has a cost, so be smart and efficient. Aim to complete tasks in
  the least number of steps.
- Provide the full code when writing to files. Do not use shortcuts.

Generate necessary code for programming tasks within WRITE_TO_FILE or APPEND_TO_FILE commands.

WRITE_TO_FILE overwrites content, APPEND_TO_FILE adds without overwriting.

Be efficient. Provide complete code when possible. Communicate with users by writing info to a file and opening it with OPEN_FILE_AT_LINE. Use markdown files for better readability.

Separate all commands with "~."

Your goal is to complete all tasks given by the user no matter what. Make valid
assumptions when necessary to complete your task.
It is imperative that you reply with all code necessary in order to complete given tasks.
If you are unable to complete a task, reply with INVALID_REQUEST "reason", and provide
which task as well as the reason why you are unable to complete it.

RFC command is used to request code from a file. If the user has not replied with
code, use the RFC command if necessary. Do not add other commands with RFC, as
they will be ignored entirely.

Provided workspace file names (for completing tasks):
`;
// This prompt was created with GPT-4 + human help.

async function prompt(json, rfcMessage) {
    console.log(chalk.bgBlue.white.bold(' PROMPT '), chalk.blue(json.prompt));
    // Query
    let hasError = false;
    let errorMessage = '';
    let tokensUsed = 0;

    let res = '';
    let messages = [];

    // partition token counts
    let optimizedData = getOptimizedData(
        PRE_PROMPT,
        json.prompt,
        json.workspaceFiles,
        rfcMessage
    );

    json.prompt = optimizedData.userPrompt;
    rfcMessage = optimizedData.rfcContent;
    json.workspaceFiles = optimizedData.workspaceFiles;

    if (rfcMessage !== '') {
        messages = [
            {
                role: 'user',
                content:
                    PRE_PROMPT + json.workspaceFiles + ' Prompt: ' + json.prompt
            },
            {
                role: 'assistant',
                content: '(RFC Request)'
            },
            { role: 'user', content: 'RFC Response: ' + rfcMessage }
        ];
    } else {
        messages = [
            {
                role: 'user',
                content:
                    PRE_PROMPT + json.workspaceFiles + ' Prompt: ' + json.prompt
            }
        ];
    }

    await openapi
        .createChatCompletion({
            model: 'gpt-3.5-turbo',
            messages: messages
        })
        .then(
            data => {
                res = data.data.choices[0].message.content;
                tokensUsed = data.data.usage.total_tokens;
            },
            error => {
                console.log(
                    chalk.red('\n\nERROR QUERYING OPENAI vvvvvvvvv\n\n')
                );
                console.error(error.response.data);
                console.log(
                    chalk.red('\n\nERROR QUERYING OPENAI ^^^^^^^^^\n\n')
                );
                hasError = true;
                errorMessage = error.response.data;
            }
        );

    console.log(chalk.bgRed.white.bold(' RESPONSE: '));
    console.log(
        chalk.red('├──────── ') +
            chalk.red(res.substring(0, 250).split('~.').join('\n├──────── ')) +
            '\n'
    );
    let price = ((tokensUsed / 1000) * 0.002).toFixed(4);
    console.log(chalk.bgGreen.white.bold(' PRICE '), chalk.green('$' + price));
    // log time in dd-mm-yyyy hh:mm:ss am/pm format
    let date = new Date();
    let hours = date.getHours();
    let minutes = date.getMinutes();
    let seconds = date.getSeconds();
    let ampm = hours >= 12 ? 'pm' : 'am';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    minutes = minutes < 10 ? '0' + minutes : minutes;
    seconds = seconds < 10 ? '0' + seconds : seconds;
    let strTime =
        date.getDate() +
        '-' +
        (date.getMonth() + 1) +
        '-' +
        date.getFullYear() +
        ' ' +
        hours +
        ':' +
        minutes +
        ':' +
        seconds +
        ' ' +
        ampm;

    console.log(chalk.bgMagenta.white.bold(' TIME '), chalk.magenta(strTime));

    // if response starts with 'RFC', log it
    if (res.trim().startsWith('RFC')) {
        console.log(
            chalk.bgRed.white.bold(' CONTENT RFC '),
            chalk.red(res.split('"')[1])
        );

        // log the first 100 characters of the file and ...
    }

    if (rfcMessage) {
        let rfcContent = rfcMessage.substring(0, 100);
        console.log(
            chalk.bgGreen.black.bold(' RFC RECEIVED '),
            chalk.green(rfcContent + '...')
        );
    }

    // log token counts with different colors
    console.log(
        '\n' +
            chalk.bgWhite.black.bold(' TOKENS USED ') +
            ' \t\t\t\t' +
            chalk.white(tokensUsed)
    );
    // pre prompt tokens
    console.log(
        '├────────' +
            chalk.bgRed.bold(' PRE-PROMPT TOKENS ') +
            ' \t\t' +
            chalk.red(optimizedData.tokenCounts.basePromptTokens)
    );
    // prompt tokens
    console.log(
        '├────────' +
            chalk.bgYellow.bold(' PROMPT TOKENS ') +
            ' \t\t' +
            chalk.yellow(optimizedData.tokenCounts.userPromptTokens)
    );
    // workspace files tokens
    console.log(
        '├────────' +
            chalk.bgGreen.bold(' WORKSPACE FILES TOKENS ') +
            ' \t' +
            chalk.green(optimizedData.tokenCounts.workspaceFilesTokens)
    );
    // rfc message tokens
    console.log(
        '└────────' +
            chalk.bgBlue.white.bold(' RFC MESSAGE TOKENS ') +
            ' \t\t' +
            chalk.blue(optimizedData.tokenCounts.rfcContentTokens) +
            '\n'
    );

    return {
        err: hasError,
        errMessage: errorMessage,
        response: res,
        tokensUsed: tokensUsed
    };
}

module.exports = {
    prompt
};
