const { getInput, info } = require('@actions/core');
const { readFileSync } = require('fs');

function getCommentBody() {
    const directComment = getInput('comment_body');
    const commentPath = getInput('comment_body_path');

    if (directComment && commentPath) {
        throw new Error("Both 'comment_body' and 'comment_body_path' inputs were provided. Please use only one.");
    }

    if (commentPath) {
        try {
            info(`Reading comment body from file: ${commentPath}`);
            return readFileSync(commentPath, 'utf8');
        } catch (error) {
            throw new Error(`Could not read file at path: ${commentPath}. Error: ${error.message}`);
        }
    }

    if (directComment) {
        return directComment;
    }

    throw new Error("Either a 'comment_body' or a 'comment_body_path' input must be supplied.");
}

module.exports = { getCommentBody };