const core = require("@actions/core");
const github = require("@actions/github");
const { graphql } = require("@octokit/graphql");
const graphqlWithAuth = graphql.defaults({
    headers: {
        authorization: `token ${process.env.GITHUB_TOKEN}`,
    },
});

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
        await octokit.rest.issues.createComment({
            owner,
            repo,
            issue_number: prNumber,
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

        const response = await octokit.rest.issues.listComments({
            owner,
            repo,
            issue_number: prNumber
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
        return targetReview;

    } catch (error) {
        core.setFailed(error.message);
    }
}

async function dismissReview(reviewId) {
    core.info(`Starting to dismiss a review with id ${reviewId}...`);
    try {
        const token = core.getInput('github_token', { required: true });

        if (!token) {
            throw new Error('GITHUB_TOKEN is not available. Ensure the workflow has proper permissions.');
        }

        const prNumber = github.context.payload.pull_request.number;

        if (!prNumber) {
            core.warning('Not a pull request, skipping review dismissal.');
            return;
        }

        const octokit = github.getOctokit(token);

        const { owner, repo } = github.context.repo;
        const dismissMessage = `This review (#${reviewId}) is outdated.`;
        await octokit.rest.pulls.dismissReview({
            owner,
            repo,
            pull_number: prNumber,
            review_id: reviewId,
            message: dismissMessage,
        });
        core.info(`Review (#${reviewId}) dismissed successfully. With message - ${dismissMessage}`);
        return dismissMessage;

    } catch (error) {
        core.setFailed(error.message);
    }
}

async function findDismissalMessage(reviewId, dismissMessage) {
    core.info(`Starting to find the dismissal message for review id ${reviewId}...`);
    try {
        const token = core.getInput('github_token', { required: true });

        if (!token) {
            throw new Error('GITHUB_TOKEN is not available. Ensure the workflow has proper permissions.');
        }

        const prNumber = github.context.payload.pull_request.number;

        if (!prNumber) {
            core.warning('Not a pull request, skipping finding dismissal message.');
            return;
        }

        const octokit = github.getOctokit(token);
        const { owner, repo } = github.context.repo;

        const response = await octokit.rest.pulls.listCommentsForReview({
            owner,
            repo,
            pull_number: prNumber,
            review_id: reviewId
        });
        core.info(`Total comments found for review id ${reviewId} is ${response.data.length}`);

        const comments = response.data;
        core.info(`Searching through comments - ${comments}`)

        const dismissalMessage = comments.find(comment => comment.body.includes(dismissMessage));

        if (!dismissalMessage) {
            core.setFailed(`Dismissal message not found. Couldn't find message - ${dismissMessage}`);
            return;
        }

        core.info("Dismissal message found successfully.");
        core.setOutput('dismissal_message_id', dismissalMessage.id);
        return dismissalMessage.node_id;
    } catch (error) {
        core.setFailed(error.message);
    }
}

async function hideDismissedReviewAndComment(reviewId) {
    core.info(`Starting to hide dismissed review (${reviewId})`);
    try {
        await hideReviewComments(reviewId, "OUTDATED");
        core.info("Hiding all review elements successfully.");

        // await hideComment(dismissalMessageId, "OUTDATED");
        // core.info("Dismissal comment hidden successfully.");

    } catch (error) {
        core.setFailed(error.message);
    }
}

async function hideReviewComments(reviewId, reason) {
    console.log(`Hiding review with review id: ${reviewId} for reason: ${reason}`);
    await graphqlWithAuth(
        `
      mutation($subjectId: ID!, $classifier: ReportedContentClassifiers!) {
        minimizeComment(input: {subjectId: $subjectId, classifier: $classifier}) {
          clientMutationId
        }
      }
    `,
        {
            subjectId: reviewId,
            classifier: reason,
        }
    );
}

async function main() {
    await postComment();
    let review = await findComment();
    // let dismissMessage = await dismissReview(review.id);
    // await findDismissalMessage(review.id, dismissMessage);
    await hideDismissedReviewAndComment(review.node_id);
    // await updateComment();
}

main();