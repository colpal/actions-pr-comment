const core = require("@actions/core");
const github = require("@actions/github");

async function postComment() {
    core.info("Starting to post a comment...");
    try {
        const token = core.getInput('github_token', { required: true });
        const commentBody = core.getInput('comment_body', { required: true });

        if (!token) {
            throw new Error('GITHUB_TOKEN is not available. Ensure the workflow has proper permissions.');
        }

        const prNumber = github.context.payload.pull_request.number;

        if (!prNumber) {
            core.warning('Not a pull request, skipping review submission.');
            return;
        }

        const octokit = github.getOctokit(token);

        const { owner, repo } = github.context.repo;
        await octokit.rest.pulls.createReview({
            owner,
            repo,
            pull_number: prNumber,
            event: 'COMMENT',
            body: commentBody,
        });
        core.info("Comment posted successfully.");

    } catch (error) {
        core.setFailed(error.message);
    }
}


async function main() {
    await postComment();
}

main();