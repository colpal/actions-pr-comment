const core = require('@actions/core');
const github = require('@actions/github');

async function findComment(octokit, owner, repo, commentIdentifier) {
    core.info("Starting to find a comment...");
    try {
        const author = core.getInput('author', { required: false }) || "github-actions[bot]";
        const prNumber = github.context.payload.pull_request?.number;

        if (!prNumber) {
            core.warning('Not a pull request, skipping operation.');
            return;
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
        core.setOutput('comment_body', targetComment.body);
        core.info(`Comment ID: ${targetComment.id} \n Body: ${targetComment.body} \n State: ${targetComment.state}.`);
        return targetComment;

    } catch (error) {
        core.setFailed(error.message);
    }
}

module.exports = { findComment };