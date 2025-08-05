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
            event: 'REQUEST_CHANGES',
            body: commentBody,
        });
        core.info("Comment posted successfully.");

    } catch (error) {
        core.setFailed(error.message);
    }
}

async function updateComment() {
    core.info("Starting to update a comment...");
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
        const commentId = 3089380658;
        await octokit.rest.pulls.updateReview({
            owner,
            repo,
            pull_number: prNumber,
            review_id: commentId,
            body: commentBody,
        });
        core.info("Comment updated successfully.");

    } catch (error) {
        core.setFailed(error.message);
    }
}

async function findComment() {
    core.info("Starting to find a comment...");
    try {
        const token = core.getInput('github_token', { required: true });
        const author = core.getInput('author', { required: false }) || "github-actions[bot]";
        const commentIdentifier = core.getInput('comment_identifier', { required: true });

        if (!token) {
            throw new Error('GITHUB_TOKEN is not available.');
        }

        const prNumber = github.context.payload.pull_request?.number;

        if (!prNumber) {
            core.warning('Not a pull request, skipping operation.');
            return;
        }

        const octokit = github.getOctokit(token);
        const { owner, repo } = github.context.repo;

        const response = await octokit.rest.pulls.listReviews({
            owner,
            repo,
            pull_number: prNumber
        });

        const reviews = response.data;

        const targetReview = reviews.findLast(review =>
            review.user.login === author &&
            review.body?.includes(commentIdentifier)
        );

        if (!targetReview) {
            core.setFailed('A review matching the author and identifier was not found.');
            return;
        }

        core.info("Matching review found successfully.");
        core.setOutput('comment_id', targetReview.id);
        core.setOutput('comment_body', targetReview.body);
        core.info(`Comment ID: ${targetReview.id} \n Body: ${targetReview.body} \n State: ${targetReview.state}.`);

    } catch (error) {
        core.setFailed(error.message);
    }
}

async function main() {
    await postComment();
    await findComment();
    // await updateComment();
}

main();