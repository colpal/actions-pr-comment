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
 * If both inputs are provided, an error is thrown.
 * If 'comment-body-path' is provided, reads the file content and removes BOM if present.
 * If 'comment-body' is provided, returns its value directly.
 * If neither input is provided, an error is thrown.
 * 
 * @throws {Error} If both 'comment-body' and 'comment-body-path' are provided.
 * @throws {Error} If the file at 'comment-body-path' cannot be read.
 * @throws {Error} If neither input is provided.
 * @returns {string} The comment body to be used.
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

            return renderCommentBody(fileContent);
        } catch (error) {
            throw new Error(`Could not read file at path: ${commentPath}. Error: ${error.message}`);
        }

    }

    if (directComment) {
        return renderCommentBody(directComment);
    }

    throw new Error("Either a 'comment-body' or a 'comment-body-path' input must be supplied.");
}

function renderCommentBody(commentBody) {
    logger.debug("IN RENDER");
    if (core.getInput('render-markdown', { required: false }) === 'true') {
        logger.debug("Rendering comment body as markdown enabled.");
        return commentBody;
    } else {
        logger.debug("Rendering comment body as markdown disabled.");
        return "<pre id=render-markdown-false>" + commentBody + "</pre>";
    }

}

module.exports = { getCommentBody, renderCommentBody };