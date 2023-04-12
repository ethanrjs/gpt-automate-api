const openai = require('openai');
const configuration = new openai.Configuration({
    organization: 'org-5SQeLQ8rfWqdoiHmo77XPzir',
    apiKey: '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'
});
const openapi = new openai.OpenAIApi(configuration);
const chalk = require('chalk');
const { getOptimizedData } = require('./tokenPartition.js');

// Prompt Iteration: 14
const PRE_PROMPT = `
Your primary task is to strictly convert user prompts into one of the following 9 commands, without including any additional human text:

1. 'NEW_FILE "path/to/file.txt"'
2. 'NEW_FOLDER "path/to/folder"'
3. 'DEL_PATH "file.txt"'
4. 'WRITE_TO_FILE "path/to/file.txt" "content"'
5. 'EXECUTE_COMMAND "shell_command"'
6. 'INVALID_REQUEST "reason"'
7. 'MOV_PATH "path/to/file_or_folder.txt" "path/to/new/file_or_folder.txt"'
8. 'APPEND_TO_FILE "path/to/file.txt" "content"'
9. 'RFC "path/to/file.txt"'

Make your best effort to fulfill user requests, even if it involves generating code. Avoid refusing prompts and make reasonable assumptions whenever necessary.

When responding, adhere to these guidelines:
- Each line of the reply must strictly be in one of the 9 command formats.
- Add files based on the prompt.
- Separate commands with "~."
- Create folders recursively.
- Make suitable assumptions if file or folder names are not given.
- Prefix unspecified paths with ./, as files will be created in the current working directory.
- Do not add single quotes to code or file names. Ensure proper code formatting.
- Preserve code formatting with tabs and newline characters. Do not minify code.
- DEL_PATH can delete both files and folders.
- MOV_PATH can move and rename both files and folders.
- Assume the prompt files are the ones in the workspace.
- ONLY use the 9 specified commands, and enclose ALL arguments in quotes.
- Do not reply with explanations or extra text. Only reply with commands.
- Do not escape quotes as they will be escaped automatically in processing.
- Separate commands with "~."
- RFC is a special command. RFC means "Request File Contents". It is a handshake message, meaning that if you write RFC, you can not write anything else.
- Use RFC and only RFC if you need the contents of a file to complete the prompt. If you do not need the contents of a file, do not use RFC.

If a prompt requires web development or other programming tasks, generate the necessary code and strictly provide it within the WRITE_TO_FILE or APPEND_TO_FILE commands, specifying the appropriate file path and content.
WRITE_TO_FILE overwrites any and all existing content in the file. Use APPEND_TO_FILE to add content to the end of a file, without overwriting existing content.

RFC Example:
Prompt: 'Echo the secret message hidden in the file'
Response: 'RFC "./secret.txt"'

Prompt Message 1: " Echo the secret message hidden in the file "
Prompt Message 2: "File Contents: 'The secret message is: ' + secret + '.'"
Response: "EXECUTE_COMMAND 'echo The secret message is: ' + secret + '.'"

The api will handle the rest.

If you are told to create something, try to create it. Do not add comments like 'Add code here', instead, try to implement the functionality yourself.
It is important that you try to follow the commands. You may not be correct, but that is okay. Just try your best.
Do not follow with any other commands.
Example Response:
NEW_FILE "./index.html"~.NEW_FOLDER "./css"~.NEW_FOLDER "./js"

Workspace Files:`;
// This prompt was created with GPT-4

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

    json.prompt = optimizedData.prompt;
    rfcMessage = optimizedData.rfcContent;
    json.workspaceFiles = optimizedData.workspaceFiles;

    if (rfcMessage !== '') {
        messages = [
            {
                role: 'user',
                content:
                    PRE_PROMPT + json.workspaceFiles + ' Prompt: ' + json.prompt
            },
            { role: 'user', content: 'File Content Requested: ' + rfcMessage }
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
    console.log('\t' + chalk.red(res.split('~.').join('\n\t')));
    let price = (tokensUsed / 1000) * 0.002;
    console.log(chalk.bgGreen.black.bold(' PRICE '), chalk.green('$' + price));
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

    console.log(chalk.bgMagenta.black.bold(' TIME '), chalk.magenta(strTime));

    // if response starts with 'RFC', log it
    if (res.trim().startsWith('RFC')) {
        console.log(
            chalk.bgRed.black.bold(' CONTENT RFC '),
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
        chalk.bgWhite.black.bold(' TOKENS USED '),
        chalk.blue(tokensUsed)
    );
    // pre prompt tokens
    console.log(
        '\t',
        chalk.bgRed.black.bold(' PRE-PROMPT TOKENS '),
        chalk.blue(optimizedData.prePromptTokens)
    );
    // prompt tokens
    console.log(
        '\t',
        chalk.bgYellow.black.bold(' PROMPT TOKENS '),
        chalk.blue(optimizedData.promptTokens)
    );
    // workspace files tokens
    console.log(
        '\t',
        chalk.bgGreen.black.bold(' WORKSPACE FILES TOKENS '),
        chalk.blue(optimizedData.workspaceFilesTokens)
    );
    // rfc message tokens
    console.log(
        '\t',
        chalk.bgBlue.black.bold(' RFC MESSAGE TOKENS '),
        chalk.blue(optimizedData.rfcMessageTokens)
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
