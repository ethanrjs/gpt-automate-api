import { Configuration, OpenAIApi } from 'openai';
import chalk from 'chalk';
import { getOptimizedData } from './tokenPartition.js';

const configuration = new Configuration({
    organization: 'org-5SQeLQ8rfWqdoiHmo77XPzir',
    apiKey: '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'
});
const openapi = new OpenAIApi(configuration);

// Prompt Iteration: 27
const PRE_PROMPT = `
You are an AI Super-Developer that is designed to translate user commands inputted from a prompt in an IDE to complete actions from a set of ten commands,
including programming tasks.

You must only use the following ten commands:

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

Guidelines:
- Separate commands with a ~.
- Only use the ten given commands
- Do not use any other commands
- If you cannot complete a request, add an INVALID_REQUEST command with a reason
- Writing to a file overwrites a file entirely. Try to append to a file instead.
- Be terse and meet the request with as few commands as possible.
- Write the full and complete required code in order to meet your goal.
- Prefix all file paths in arguments with a ./

EXECUTE_COMMAND executes shell commands on the user's OS:
- Operating System: ${process.platform}
- Shell: ${process.env.SHELL}
- Current Working Directory: ${process.cwd()}


The RFC command is a special command. If you need to read the contents of a file
to complete your goal, only enter the RFC command in response. Then, you will
receive another request with the contents of the file you requested. It is 
imperative that you only enter the RFC command in response to a request for it.

Complete the request by any means necessary. If needed, fill in any gaps with
reasonable assumptions. If you cannot complete the request, add an INVALID_REQUEST
but complete any other requests that you can to the best of your ability.

Write any and all code necessary to complete requests. Include ALL code. Do not
abbreviate. Do not shorten code. Do not use placeholders. Write all code necessary.

Commands should be separated with a ~. For example, if you need to create a file and then make a folder, you would write:
NEW_FILE "path/to/file.txt"~.NEW_FOLDER "path/to/folder"

Enter code for development in WRITE_TO_FILE and APPEND_TO_FILE commands.

Here's a list of files in the user's workspace for context:
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
    const optimizedData = getOptimizedData(
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
                content: `${PRE_PROMPT + json.workspaceFiles} Your Goal: ${
                    json.prompt
                }`
            },
            {
                role: 'assistant',
                content: '(RFC Request)'
            },
            { role: 'user', content: `RFC Response: ${rfcMessage}` }
        ];
    } else {
        messages = [
            {
                role: 'user',
                content: `${PRE_PROMPT + json.workspaceFiles} Your Goal: ${
                    json.prompt
                }`
            }
        ];
    }

    await openapi
        .createChatCompletion({
            model: 'gpt-3.5-turbo',
            messages
        })
        .then(
            data => {
                res = data.data.choices[0].message.content;
                tokensUsed = data.data.usage.total_tokens;
            },
            error => {
                console.log(chalk.red('\n\nERROR QUERYING OPENAI vvvvvvvvv\n\n'));
                console.error(error.response.data);
                console.log(chalk.red('\n\nERROR QUERYING OPENAI ^^^^^^^^^\n\n'));
                hasError = true;
                errorMessage = error.response.data;
            }
        );

    console.log(chalk.bgRed.white.bold(' RESPONSE: '));
    console.log(
        `${
            chalk.red('├──────── ') +
            chalk.red(res.substring(0, 250).split('~.').join('\n├──────── '))
        }\n`
    );
    const price = ((tokensUsed / 1000) * 0.002).toFixed(4);
    console.log(chalk.bgGreen.white.bold(' PRICE '), chalk.green(`$${price}`));
    // log time in dd-mm-yyyy hh:mm:ss am/pm format
    const date = new Date();
    let hours = date.getHours();
    let minutes = date.getMinutes();
    let seconds = date.getSeconds();
    const ampm = hours >= 12 ? 'pm' : 'am';
    hours %= 12;
    hours = hours || 12; // the hour '0' should be '12'
    minutes = minutes < 10 ? `0${minutes}` : minutes;
    seconds = seconds < 10 ? `0${seconds}` : seconds;
    const strTime = `${date.getDate()}-${
        date.getMonth() + 1
    }-${date.getFullYear()} ${hours}:${minutes}:${seconds} ${ampm}`;

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
        const rfcContent = rfcMessage.substring(0, 100);
        console.log(
            chalk.bgGreen.black.bold(' RFC RECEIVED '),
            chalk.green(`${rfcContent}...`)
        );
    }

    // log token counts with different colors
    console.log(
        `\n${chalk.bgWhite.black.bold(' TOKENS USED ')} \t\t\t\t${chalk.white(
            tokensUsed
        )}`
    );
    // pre prompt tokens
    console.log(
        `├────────${chalk.bgRed.bold(' PRE-PROMPT TOKENS ')} \t\t${chalk.red(
            optimizedData.tokenCounts.basePromptTokens
        )}`
    );
    // prompt tokens
    console.log(
        `├────────${chalk.bgYellow.bold(' PROMPT TOKENS ')} \t\t${chalk.yellow(
            optimizedData.tokenCounts.userPromptTokens
        )}`
    );
    // workspace files tokens
    console.log(
        `├────────${chalk.bgGreen.bold(
            ' WORKSPACE FILES TOKENS '
        )} \t${chalk.green(optimizedData.tokenCounts.workspaceFilesTokens)}`
    );
    // rfc message tokens
    console.log(
        `└────────${chalk.bgBlue.white.bold(
            ' RFC MESSAGE TOKENS '
        )} \t\t${chalk.blue(optimizedData.tokenCounts.rfcContentTokens)}\n`
    );

    return {
        err: hasError,
        errMessage: errorMessage,
        response: res,
        tokensUsed
    };
}

export {
    prompt
};
