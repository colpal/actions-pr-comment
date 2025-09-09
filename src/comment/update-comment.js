const { getCommentBody } = require("../util/util");

const github = require("@actions/github");
const { logger } = require('../util/logger.js');

/**
 * Updates a GitHub pull request comment with new content.
 *
 * Depending on the updateType, the comment body is either replaced or appended with new content.
 * - "replace": Replaces the comment body with the commentIdentifier and new content.
 * - "append": Appends new content to the existing comment body, separated by a divider and timestamp.
 *
 * @async
 * @param {object} octokit - The authenticated Octokit REST client instance.
 * @param {string} owner - The owner of the repository.
 * @param {string} repo - The name of the repository.
 * @param {object} comment - The existing comment object to update.
 * @param {string} commentIdentifier - A string used to identify the comment (used in "replace" mode).
 * @param {string} updateType - The type of update ("replace" or "append").
 * @param {string} conclusionIdentifier - A string to identify the conclusion, appended to the comment body.
 * @returns {Promise<void>} Resolves when the comment is updated or skips if not a pull request.
 */
async function updateComment(octokit, owner, repo, comment, commentIdentifier, updateType, conclusionIdentifier) {
    logger.info("Starting to update a comment...");
    let newCommentBody = getCommentBody();

    const prNumber = github.context.payload.pull_request.number;

    if (!prNumber) {
        logger.warning('Not a pull request, skipping review submission.');
        throw new Error('No pull request number found in the context.');
    }

    let commentBody = ""
    switch (updateType) {
        case "replace":
            logger.debug("Replacing comment body.");
            commentBody = commentIdentifier + "\n" + newCommentBody + "\n" + conclusionIdentifier;
            break;
        case "append": {
            logger.debug("Appending to comment body.");
            const timestamp = new Date().toUTCString();
            const divider = `\n\n---\n\n*Update posted on: ${timestamp}*\n\n`;

            comment.body = comment.body.replace(/<!-- CONCLUSION: (failure|success|neutral) -->$/, ""); //remove any existing conclusion identifier

            commentBody = comment.body + divider + newCommentBody + "\n" + conclusionIdentifier; // dont need comment identifier here since it is already on the comment
            break;
        }
        default: {
            logger.warning(`Unknown update type: ${updateType}`);
            throw new Error(`Unknown update type: ${updateType}`);
        }
    }

    await octokit.rest.issues.updateComment({
        owner: owner,
        repo: repo,
        comment_id: comment.id,
        body: commentBody,
    });
    logger.debug("Comment updated successfully.");
}

module.exports = { updateComment };