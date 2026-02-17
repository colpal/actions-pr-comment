const core = require('@actions/core');
const { readFileSync } = require('fs');
const { logger } = require('../util/logger.js');


/**
 * Retrieves the comment body for a GitHub Action.
 * 
 * The comment body can be provided directly via the 'comment-body' input,
 * or via a file specified by the 'comment-body-path' input. Only one of these
 * inputs should be provided at a time.
 * 
 * Behavior:
 * - If both inputs are provided, an error is thrown.
 * - If 'comment-body-path' is provided, reads the file content, removes BOM if present,
 *   and returns empty string if file is empty (bypassing rendering).
 * - If 'comment-body' is provided, passes it through renderCommentBody based on 'render-markdown' setting.
 * - If neither input is provided, returns an empty string.
 * 
 * @throws {Error} If both 'comment-body' and 'comment-body-path' are provided.
 * @throws {Error} If the file at 'comment-body-path' cannot be read.
 * @returns {string} The comment body to be used, either rendered as markdown or wrapped in a <pre> tag.
 */
function getCommentBody() {
    const directComment = core.getInput('comment-body');
    const commentPath = core.getInput('comment-body-path');

    if (directComment && commentPath) {
        throw new Error("Both 'comment-body' and 'comment-body-path' inputs were provided. Please use only one.");
    }

    if (commentPath) {

        try {
            logger.debug(`Reading comment body from file: ${commentPath}`);
            let fileContent = readFileSync(commentPath, 'utf8');

            if (fileContent.charCodeAt(0) === 0xFEFF) {
                fileContent = fileContent.slice(1);
            }

            // If the file is empty, return an empty string and bypass rendering which may add a <pre> tag.
            if (fileContent === "") {
                logger.debug("Comment body path's file is empty.");
                return "";
            }

            return renderCommentBody(fileContent);
        } catch (error) {
            throw new Error(`Could not read file at path: ${commentPath}. Error: ${error.message}`);
        }

    } else if (directComment) {

        return renderCommentBody(directComment);

    } else {
        logger.debug("Neither a 'comment-body' or a 'comment-body-path' input was supplied.");
        return "";
    }

}

/**
 * Renders the comment body based on the 'render-markdown' input setting.
 * 
 * If 'render-markdown' is set to 'true', returns the comment body as-is to be rendered as markdown.
 * Otherwise, wraps the comment body in a <pre> tag to display it as plain text.
 * 
 * @param {string} commentBody - The raw comment body text to be rendered.
 * @returns {string} The rendered comment body, either as-is or wrapped in a <pre> tag.
 */
function renderCommentBody(commentBody) {

    if (core.getInput('render-markdown', { required: false }) === 'true') {
        logger.debug("Rendering comment body as markdown enabled.");
        return commentBody;
    } else {
        logger.debug("Rendering comment body as markdown disabled.");
        return "<pre id=render-markdown-false>" + commentBody + "</pre>";
    }

}

module.exports = { getCommentBody, renderCommentBody };