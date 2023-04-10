const openai = require('openai');
const configuration = new openai.Configuration({
    organization: 'org-5SQeLQ8rfWqdoiHmo77XPzir',
    apiKey: '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'
});
const openapi = new openai.OpenAIApi(configuration);
const chalk = require('chalk');

// Prompt Iteration: 14
const PRE_PROMPT = `
Your primary task is to strictly convert user prompts into one of the following 8 commands, without including any additional human text:

1. 'NEW_FILE "path/to/file.txt"'
2. 'NEW_FOLDER "path/to/folder"'
3. 'DEL_PATH "file.txt"'
4. 'WRITE_TO_FILE "path/to/file.txt" "content"'
5. 'EXECUTE_COMMAND "shell_command"'
6. 'INVALID_REQUEST "reason"'
7. 'MOV_PATH "path/to/file_or_folder.txt" "path/to/new/file_or_folder.txt"'
8. 'APPEND_TO_FILE "path/to/file.txt" "content"'

Make your best effort to fulfill user requests, even if it involves generating code. Avoid refusing prompts and make reasonable assumptions whenever necessary.

When responding, adhere to these guidelines:
- Each line of the reply must strictly be in one of the 8 command formats.
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
- ONLY use the 8 specified commands, and enclose ALL arguments in quotes.
- Do not reply with explanations or extra text. Only reply with commands.
- Do not escape quotes as they will be escaped automatically in processing.
- Separate commands with "~."

If a prompt requires web development or other programming tasks, generate the necessary code and strictly provide it within the WRITE_TO_FILE or APPEND_TO_FILE commands, specifying the appropriate file path and content.
WRITE_TO_FILE overwrites any and all existing content in the file. Use APPEND_TO_FILE to add content to the end of a file, without overwriting existing content.

Example:
NEW_FILE "./index.html"~.NEW_FOLDER "./css"~.NEW_FOLDER "./js"~.

Workspace Files:`;
// This prompt was created with GPT-4

async function prompt(json) {
    console.log(chalk.bgBlue.white.bold(' PROMPT '), chalk.blue(json.prompt));
    // Query
    let hasError = false;
    let errorMessage = '';
    let tokensUsed = 0;

    let res = '';
    await openapi
        .createChatCompletion({
            model: 'gpt-3.5-turbo',
            messages: [
                {
                    role: 'user',
                    content:
                        PRE_PROMPT +
                        json.workspaceFiles +
                        ' Prompt: ' +
                        json.prompt
                }
            ]
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

    console.log(chalk.bgRed.black.bold(' RESPONSE: '));
    console.log(chalk.red(res.split('~.').join('\n\t')));
    let price = (tokensUsed / 1000) * 0.002;
    console.log(
        chalk.bgYellow.black.bold(' TOKENS USED '),
        chalk.yellow(tokensUsed)
    );
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
