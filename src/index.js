const core = require("@actions/core");
const github = require("@actions/github");
const { graphql } = require("@octokit/graphql");
const graphqlWithAuth = graphql.defaults({
    headers: {
        authorization: `token ${process.env.GITHUB_TOKEN}`,
    },
});

async function postComment(token, octokit, owner, repo) {
    core.info("Starting to post a comment...");
    let errorCaught = null;
    try {
        const commentBody = core.getInput('comment_body', { required: true });

        if (!token) {
            throw new Error('GITHUB_TOKEN is not available. Ensure the workflow has proper permissions.');
        }

        const prNumber = github.context.payload.pull_request.number;

        if (!prNumber) {
            core.warning('Not a pull request, skipping review submission.');
            return;
        }

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

async function updateComment(token, octokit, owner, repo, comment, updateType) {
    core.info("Starting to update a comment...");
    try {
        let newCommentBody = core.getInput('comment_body', { required: true });

        const prNumber = github.context.payload.pull_request.number;

        if (!prNumber) {
            core.warning('Not a pull request, skipping review submission.');
            return;
        }

        let commentBody = ""
        switch (updateType) {
            case "replace":
                core.debug("Replacing comment body.");
                commentBody = newCommentBody;
                break;
            case "append": {
                core.debug("Appending to comment body.");
                const timestamp = new Date().toUTCString();
                const divider = `\n\n---\n\n*Update posted on: ${timestamp}*\n\n`;
                commentBody = comment.body + divider + newCommentBody;
                break;
            }
            default: {
                core.warning(`Unknown update type: ${updateType}`);
                return;
            }
        }

        await octokit.rest.issues.updateComment({
            owner,
            repo,
            comment_id: comment.id,
            body: commentBody,
        });
        core.info("Comment updated successfully.");

    } catch (error) {
        core.setFailed(error.message);
    }
}

async function findComment(token, octokit, owner, repo) {
    core.info("Starting to find a comment...");
    try {
        const author = core.getInput('author', { required: false }) || "github-actions[bot]";
        const commentIdentifier = core.getInput('comment_identifier', { required: true });

        const prNumber = github.context.payload.pull_request?.number;

        if (!prNumber) {
            core.warning('Not a pull request, skipping operation.');
            return;
        }

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

async function hideComment(comment, reason, graphqlFn = graphqlWithAuth) {
    core.debug(`Hiding comment with comment id ${comment.id} (node id: ${comment.node_id}) for reason: ${reason}`);
    await graphqlFn(
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
    const token = core.getInput('github_token', { required: true });

    if (!token) {
        core.setFailed('GITHUB_TOKEN is not available. Ensure the workflow has proper permissions.');
    } else {
        const octokit = github.getOctokit(token);
        const { owner, repo } = github.context.repo;

        let comment = await findComment(token, octokit, owner, repo);
        if (!comment) {
            core.info("No existing comment found, posting a new comment.");
            await postComment(token, octokit, owner, repo);
            return;
        } else {
            core.debug(`Comment found: ${comment.body}`);
            const updateMode = core.getInput('update_mode', { required: false }) || "create";
            core.debug(`Update mode is set to: ${updateMode}`);
            if (updateMode === "create") {
                await hideComment(comment, "OUTDATED");
                await postComment();
            }
            else {
                await updateComment(token, octokit, owner, repo, comment, updateMode);
            }
        }
    }
}

module.exports = {
    postComment,
    updateComment,
    findComment,
    hideComment,
    main
};

main();