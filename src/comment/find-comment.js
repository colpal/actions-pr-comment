const core = require('@actions/core');
const github = require('@actions/github');

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
    core.info("Starting to find a comment...");
    const author = core.getInput('author', { required: false }) || "github-actions[bot]";
    const prNumber = github.context.payload.pull_request?.number;

    if (!prNumber) {
        core.warning('Not a pull request, skipping operation.');
        throw new Error('No pull request number found in the context.');
    }

    const response = await octokit.rest.issues.listComments({
        owner: owner,
        repo: repo,
        issue_number: prNumber
    });

    const comments = response.data;

    const targetComment = comments.findLast(comment =>
        comment.user.login === author &&
        comment.body?.includes(commentIdentifier)
    );

    if (!targetComment) {
        core.info('No comment matching the author and identifier was not found.');
        return;
    }

    core.info("Matching comment found successfully.");
    core.setOutput('comment_id', targetComment.id);
    core.setOutput('comment-body', targetComment.body);
    core.info(`Comment ID: ${targetComment.id} \n Body: ${targetComment.body} \n State: ${targetComment.state}.`);
    return targetComment;

}

module.exports = { findComment };