const core = require('@actions/core');
const github = require('@actions/github');
const { logger } = require('../util/logger.js');

/**
 * Finds the most recent comment on a pull request that matches the specified author and contains the given identifier in its body.
 *
 * @async
 * @param {import('@octokit/rest').Octokit} octokit - An authenticated Octokit REST client instance.
 * @param {string} owner - The owner of the repository.
 * @param {string} repo - The name of the repository.
 * @param {string} commentIdentifier - A unique string to identify the target comment in its body.
 * @returns {Promise<Object|undefined>} The matching comment object if found, otherwise undefined.
 */
async function findComment(octokit, owner, repo, commentIdentifier) {
    logger.info("Starting to find a comment...");

    const author = core.getInput('author', { required: false }) || "github-actions[bot]";
    const prNumber = github.context.payload.pull_request?.number;

    if (!prNumber) {
        logger.warning('Not a pull request, skipping operation.');
        throw new Error('No pull request number found in the context.');
    }

    // Fetch all comments using pagination
    const comments = [];
    let page = 1;
    let hasMorePages = true;

    while (hasMorePages) {
        const response = await octokit.rest.issues.listComments({
            owner: owner,
            repo: repo,
            issue_number: prNumber,
            per_page: 100,
            page: page
        });

        comments.push(...response.data);
        hasMorePages = response.data.length === 100;
        page++;
    }

    const targetComment = comments.findLast(comment =>
        comment.user.login === author &&
        comment.body?.includes(commentIdentifier)
    );

    if (!targetComment) {
        logger.debug('No comment matching the author and identifier was not found.');
        return;
    }

    core.setOutput('comment-id', targetComment.id);
    core.setOutput('comment-body', targetComment.body);
    logger.debug(`Matching comment found successfully. Comment ID: ${targetComment.id} Body: ${targetComment.body}`);
    return targetComment;
}

module.exports = { findComment };