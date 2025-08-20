const core = require("@actions/core");
const github = require("@actions/github");
const { graphql } = require("@octokit/graphql");

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

async function updateComment(commentId) {
    core.info("Starting to update a comment...");
    try {
        const token = core.getInput('github_token', { required: true });
        let commentBody = core.getInput('comment_body', { required: true });
        commentBody = " UPDATED: " + commentBody;
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
        await octokit.rest.issues.updateComment({
            owner,
            repo,
            comment_id: commentId,
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

        const comments = response.data;

        const targetComment = comments.findLast(comment =>
            comment.user.login === author &&
            comment.body?.includes(commentIdentifier)
        );

        if (!targetComment) {
            core.setFailed('A comment matching the author and identifier was not found.');
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

async function hideComment(comment, reason) {
    console.log(`Hiding comment with comment id ${comment.id} (node id: ${comment.node_id}) for reason: ${reason}`);
    const token = core.getInput('github_token', { required: true });
    const graphqlWithAuth = graphql.defaults({
        headers: {
            authorization: `token ${token}`,
        },
    });

    await graphqlWithAuth(
        `
        mutation minimizeComment($id: ID!, $classifier: ReportedContentClassifiers!) {
            minimizeComment(input: { subjectId: $id, classifier: $classifier }) {
                clientMutationId
                minimizedComment {
                    isMinimized
                    minimizedReason
                    viewerCanMinimize
                }
            }
        }
        `,
        {
            subjectId: comment.node_id,
            classifier: reason,
        }
    );
}

async function main() {
    await postComment();
    let comment = await findComment();
    await updateComment(comment.id);
    await hideComment(comment, "OUTDATED");
}

main();