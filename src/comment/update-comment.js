const { getCommentBody } = require("../util/util");

const core = require("@actions/core");
const github = require("@actions/github");

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
 * @returns {Promise<void>} Resolves when the comment is updated or skips if not a pull request.
 */
async function updateComment(octokit, owner, repo, comment, commentIdentifier, updateType) {
    core.info("Starting to update a comment...");
    try {
        let newCommentBody = getCommentBody();

        const prNumber = github.context.payload.pull_request.number;

        if (!prNumber) {
            core.warning('Not a pull request, skipping review submission.');
            return;
        }

        let commentBody = ""
        switch (updateType) {
            case "replace":
                core.info("Replacing comment body.");
                commentBody = commentIdentifier + newCommentBody;
                break;
            case "append": {
                core.info("Appending to comment body.");
                const timestamp = new Date().toUTCString();
                const divider = `\n\n---\n\n*Update posted on: ${timestamp}*\n\n`;
                commentBody = comment.body + divider + newCommentBody; // dont need comment identifier here since it is already on the comment
                break;
            }
            default: {
                core.warning(`Unknown update type: ${updateType}`);
                return;
            }
        }

        await octokit.rest.issues.updateComment({
            owner: owner,
            repo: repo,
            comment_id: comment.id,
            body: commentBody,
        });
        core.info("Comment updated successfully.");

    } catch (error) {
        core.setFailed(error.message);
    }
}

module.exports = { updateComment };