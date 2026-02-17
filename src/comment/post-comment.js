const { getCommentBody } = require("../util/util");

const github = require("@actions/github");
const { logger } = require('../util/logger.js');

/**
 * Posts a comment to a pull request using the provided Octokit instance.
 *
 * If the comment body is empty and hideOnEmpty is true, the function will skip posting
 * and return undefined. Otherwise, it constructs the full comment body by prepending
 * the commentIdentifier and conclusionIdentifier to the comment body, then posts it.
 *
 * @async
 * @function postComment
 * @param {object} octokit - An authenticated Octokit REST client instance.
 * @param {string} owner - The owner of the repository.
 * @param {string} repo - The name of the repository.
 * @param {string} commentIdentifier - A string to identify the comment, prepended to the comment body.
 * @param {string} conclusionIdentifier - A string to identify the conclusion, appended to the comment body.
 * @param {boolean} hideOnEmpty - Whether to skip posting if the comment body is empty.
 * @returns {Promise<object|undefined>} Resolves with the created comment data, or undefined if skipped.
 * @throws {Error} If no pull request number is found in the context.
 */
async function postComment(octokit, owner, repo, commentIdentifier, conclusionIdentifier, hideOnEmpty) {
    logger.info("Starting to post a comment...");

    let commentBody = getCommentBody();

    if (commentBody === "" && hideOnEmpty) {
        logger.debug("Comment body is empty. Skipping comment post.");
        return;
    }

    commentBody = commentIdentifier + "\n" + conclusionIdentifier + "\n" + commentBody;

    const prNumber = github.context.payload.pull_request.number;

    if (!prNumber) {
        logger.warning('Not a pull request, skipping review submission.');
        throw new Error('No pull request number found in the context.');
    }

    const response = await octokit.rest.issues.createComment({
        owner: owner,
        repo: repo,
        issue_number: prNumber,
        body: commentBody,
    });
    logger.debug("Comment posted successfully.");
    return response?.data;
}

module.exports = { postComment };