const core = require("@actions/core");
const github = require("@actions/github");

async function postComment(octokit, owner, repo, commentIdentifier) {
    core.info("Starting to post a comment...");
    try {
        const commentBody = core.getInput('comment_body', { required: true }) + commentIdentifier;

        const prNumber = github.context.payload.pull_request.number;

        if (!prNumber) {
            core.warning('Not a pull request, skipping review submission.');
            return;
        }

        await octokit.rest.issues.createComment({
            owner: owner,
            repo: repo,
            issue_number: prNumber,
            body: commentBody,
        });
        core.info("Comment posted successfully.");

    } catch (error) {
        core.setFailed(error.message);
    }
}

module.exports = { postComment };