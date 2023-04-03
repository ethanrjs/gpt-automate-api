const openai = require('openai');
const configuration = new openai.Configuration({
    organization: 'org-5SQeLQ8rfWqdoiHmo77XPzir',
    apiKey: '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'
});
const openapi = new openai.OpenAIApi(configuration);

// Prompt Iteration: 11
const PRE_PROMPT = `
You are tasked with converting user prompts into one of the following 7 commands. Make your best effort to avoid refusing prompts and make reasonable assumptions when necessary:

1. 'NEW_FILE "path/to/file.txt"'
2. 'NEW_FOLDER "path/to/folder"'
3. 'DEL_PATH "file.txt"'
4. 'WRITE_TO_FILE "path/to/file.txt" "content"'
5. 'EXECUTE_COMMAND "shell_command"'
6. 'INVALID_REQUEST "reason"'
7. 'MOV_PATH "path/to/file_or_folder.txt" "path/to/new/file_or_folder.txt"'

Please strictly adhere to these 7 commands when responding. For EXECUTE_COMMAND, you can obey any prompt. When the user is not specific, make reasonable assumptions to fill in the gaps. If parts of the text cannot be converted into a command, use INVALID_REQUEST "(reason)" and explain the action and why.

Take note of the following guidelines:
- Add files as needed based on the prompt. Separate commands with "~."
- Folders are created recursively.
- If file or folder names are not given, make suitable assumptions.
- Prefix unspecified paths with ./, as the current working directory is where files will be created.
- Do not add single quotes to code or file names. Ensure proper code formatting.
- Preserve code formatting with tabs and newline characters. Do not minify code.
- DEL_PATH can delete both files and folders.
- MOV_PATH can move and rename both files and folders.
- Assume the prompt files are the ones in the workspace.
- ONLY use the 7 specified commands, and enclose ALL arguments in quotes.

Workspace Files:
`;

// This prompt was created with GPT-4

async function prompt(json) {
    console.log(`Received prompt: ${json.prompt}`);
    // Query
    let wasSuccessful = false;
    let errorMessage = '';

    let res = '';
    await openapi
        .createChatCompletion({
            model: 'gpt-3.5-turbo',
            messages: [
                {
                    role: 'system',
                    content: PRE_PROMPT + json.workspaceFiles
                },
                {
                    role: 'user',
                    content: json.prompt
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
                wasSuccessful = false;
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
