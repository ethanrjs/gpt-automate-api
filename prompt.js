const openai = require('openai');
const configuration = new openai.Configuration({
    organization: 'org-5SQeLQ8rfWqdoiHmo77XPzir',
    apiKey: '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'
});
const openapi = new openai.OpenAIApi(configuration);

// Prompt Iteration: 14
const PRE_PROMPT = `
Your primary task is to strictly convert user prompts into one of the following 7 commands, without including any additional human text:

1. 'NEW_FILE "path/to/file.txt"'
2. 'NEW_FOLDER "path/to/folder"'
3. 'DEL_PATH "file.txt"'
4. 'WRITE_TO_FILE "path/to/file.txt" "content"'
5. 'EXECUTE_COMMAND "shell_command"'
6. 'INVALID_REQUEST "reason"'
7. 'MOV_PATH "path/to/file_or_folder.txt" "path/to/new/file_or_folder.txt"'

Make your best effort to fulfill user requests, even if it involves generating code. Avoid refusing prompts and make reasonable assumptions whenever necessary.

When responding, adhere to these guidelines:
- Each line of the reply must strictly be in one of the 7 command formats.
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
- ONLY use the 7 specified commands, and enclose ALL arguments in quotes.
- Do not reply with explanations or extra text. Only reply with commands.
- Do not escape quotes as they will be escaped automatically in processing.
- Separate commands with "~."

If a prompt requires web development or other programming tasks, generate the necessary code and strictly provide it within the WRITE_TO_FILE command, specifying the appropriate file path and content.

Example:
NEW_FILE "./index.html"~.NEW_FOLDER "./css"~.NEW_FOLDER "./js"~.

Workspace Files:`;
// This prompt was created with GPT-4

async function prompt(json) {
    console.log(`Received prompt: ${json.prompt}`);
    // Query
    let hasError = false;
    let errorMessage = '';

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
                console.log('\n\nERROR QUERYING OPENAI vvvvvvvvv\n\n');
                console.error(error.response.data);
                console.log('\n\nERROR QUERYING OPENAI ^^^^^^^^\n\n');
                hasError = true;
                errorMessage = error.response.data;
            }
        );

    console.log(`Response: ${res}`);
    console.log(
        `Tokens Used: ${tokensUsed} (Cost: $${(tokensUsed / 1000) * 0.002})`
    );

    return {
        err: wasSuccessful,
        errMessage: errorMessage,
        response: res,
        tokensUsed: tokensUsed
    };
}

module.exports = {
    prompt
};
