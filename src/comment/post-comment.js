const { getCommentBody } = require("../util/util");

const core = require("@actions/core");
const github = require("@actions/github");

/**
 * Posts a comment to a pull request using the provided Octokit instance.
 *
 * @async
 * @function postComment
 * @param {object} octokit - An authenticated Octokit REST client instance.
 * @param {string} owner - The owner of the repository.
 * @param {string} repo - The name of the repository.
 * @param {string} commentIdentifier - A string to identify the comment, prepended to the comment body.
 * @returns {Promise<void>} Resolves when the comment is posted or skipped if not a pull request.
 */
async function postComment(octokit, owner, repo, commentIdentifier) {
    core.info("Starting to post a comment...");
    const commentBody = commentIdentifier + "\n" + getCommentBody();

    const prNumber = github.context.payload.pull_request.number;

    if (!prNumber) {
        core.warning('Not a pull request, skipping review submission.');
        throw new Error('No pull request number found in the context.');
    }

    await octokit.rest.issues.createComment({
        owner: owner,
        repo: repo,
        issue_number: prNumber,
        body: commentBody,
    });
    core.info("Comment posted successfully.");

}


module.exports = { postComment };