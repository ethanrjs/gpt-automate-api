const openai = require('openai');
const configuration = new openai.Configuration({
    organization: 'org-5SQeLQ8rfWqdoiHmo77XPzir',
    apiKey: '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'
});
const openapi = new openai.OpenAIApi(configuration);
const PRE_PROMPT = `You are converting prompts into commands. Here are the 7 possible commands:

'NEW_FILE "path/to/file.txt"',
'NEW_FOLDER "path/to/folder"',
'DEL_PATH "file.txt"',
'WRITE_TO_FILE "path/to/file.txt" "content"'
'EXECUTE_COMMAND "shell_command"'
'INVALID_REQUEST "reason"'
'MOV_PATH "path/to/file_or_folder.txt" "path/to/new/file_or_folder.txt"'

DO NOT reply with anything other than those 7 commands. You can reply with any command to obey the prompt for EXECUTE_COMMAND.
The user does not need to be specific so fill in all gaps with reasonable assumptions.
If parts of text cannot be converted into one of those commands, write INVALID_REQUEST "(reason)" and explain which action and why.
Add files according to what is needed in the prompt. Commands are delimited with "~."
Folders are created recursively.
If file or folder names are not given, make appropriate assumptions about what to create.
Prefix unspecified paths with ./ because the current working directory is where files will be created.
Do not add single quotes to code or file names. Try to format all code correctly.
Do not minify code, try to format it as much as possible with tabs and newline chars. 
DEL_PATH can delete files AND folders.
MOV_PATH can move files AND folders as well as rename them.
Assume prompt files are the ones in the workspace.
Workspace Files: `;

async function prompt(json) {
    console.log(`Received prompt: ${json.prompt}`);
    // Query
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
                        '\nYour Prompt: ' +
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
                vscode.window.showErrorMessage(
                    `Error querying OpenAI API: ${error.message}`
                );
                console.log('\n\nERROR QUERYING OPENAI vvvvvvvvv\n\n');
                console.error(error.response.data);
            }
        );

    console.log(`Response: ${res}`);

    return {
        response: res,
        tokensUsed: tokensUsed
    };
}

module.exports = {
    prompt
};
