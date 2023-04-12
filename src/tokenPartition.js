const tiktoken = require('@dqbd/tiktoken');
const enc = tiktoken.encoding_for_model('gpt-3.5-turbo');

/**
 * This function balances the token counts of userPrompt, workspaceFiles, and rfcContent.
 * It trims the text to fit within the maximum token limit of 4096 tokens.
 *
 * @param {string} basePrompt - The base prompt that must always be included.
 * @param {string} userPrompt - The user prompt (highest priority, up to 512 tokens).
 * @param {string} workspaceFiles - The workspace files (lower priority, up to 1024 tokens).
 * @param {string} rfcContent - The RFC content (medium priority, between 2048 and 3072 tokens).
 * @returns {object} - An object containing the optimized data.
 */
function getOptimizedData(
    basePrompt = '',
    userPrompt = '',
    workspaceFiles = '',
    rfcContent = ''
) {
    // Calculate the token count of the base prompt
    const basePromptTokens = enc.encode(basePrompt).length;

    // Calculate the remaining tokens available after including the base prompt
    const remainingTokens = 4096 - basePromptTokens;

    // Calculate the token counts of the other components
    let userPromptTokens = enc.encode(userPrompt).length;
    let workspaceFilesTokens = enc.encode(workspaceFiles).length;
    let rfcContentTokens = enc.encode(rfcContent).length;

    // Limit the userPrompt tokens to 512
    if (userPromptTokens > 512) {
        userPrompt = enc.decode(enc.encode(userPrompt).slice(0, 512));
        userPromptTokens = 512;
    }

    // Calculate the remaining tokens after considering the user prompt
    const remainingTokensAfterUserPrompt = remainingTokens - userPromptTokens;

    // If the rfcContent and workspaceFiles tokens are within the allowed limits, no need to cut
    if (rfcContentTokens <= 3072 && workspaceFilesTokens <= 1024) {
        return {
            basePrompt,
            userPrompt,
            workspaceFiles,
            rfcContent
        };
    }

    // Calculate the tokens left for rfcContent and workspaceFiles
    const rfcContentAvailableTokens = Math.max(
        Math.min(3072, remainingTokensAfterUserPrompt * 0.7),
        2048
    );
    const workspaceFilesAvailableTokens =
        remainingTokensAfterUserPrompt - rfcContentAvailableTokens;

    // Trim rfcContent if necessary
    if (rfcContentTokens > rfcContentAvailableTokens) {
        rfcContent = enc.decode(
            enc.encode(rfcContent).slice(0, rfcContentAvailableTokens)
        );
        rfcContentTokens = rfcContentAvailableTokens;
    }

    // Trim workspaceFiles if necessary
    if (workspaceFilesTokens > workspaceFilesAvailableTokens) {
        workspaceFiles = enc.decode(
            enc.encode(workspaceFiles).slice(0, workspaceFilesAvailableTokens)
        );
    }

    // Return the optimized data
    return {
        basePrompt,
        userPrompt,
        workspaceFiles,
        rfcContent,

        basePromptTokens,
        userPromptTokens,
        workspaceFilesTokens,
        rfcContentTokens
    };
}

module.exports = {
    getOptimizedData
};
