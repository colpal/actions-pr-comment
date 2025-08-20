const core = require("@actions/core");
const github = require("@actions/github");
const { graphql } = require("@octokit/graphql");
const graphqlWithAuth = graphql.defaults({
    headers: {
        authorization: `token ${process.env.GITHUB_TOKEN}`,
    },
});

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

async function updateComment(octokit, owner, repo, comment, updateType) {
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
                core.info("Replacing comment body.");
                commentBody = newCommentBody;
                break;
            case "append": {
                core.info("Appending to comment body.");
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
            owner: owner,
            repo: repo,
            comment_id: comment.id,
            body: commentBody,
        });
        core.info("Comment updated successfully.");

    } catch (error) {
        core.setFailed(error.message);
    }
}

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

async function hideComment(comment, reason, graphqlFn = graphqlWithAuth) {
    core.info(`Hiding comment with comment id ${comment.id} (node id: ${comment.node_id}) for reason: ${reason}`);
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

async function initializeStatusCheck(octokit, owner, repo, checkName) {
    core.info(`Creating a pending check named "${checkName}"...`);
    const { data: checkRun } = await octokit.rest.checks.create({
        owner: owner,
        repo: repo,
        name: checkName,
        head_sha: github.context.payload.pull_request?.head.sha || github.context.sha,
        status: 'in_progress',
    });
    return checkRun.id;
}

async function finalizeStatusCheck(octokit, owner, repo, checkRunId, checkName, status, conclusion) {
    core.info(`Finalizing status check with ID: ${checkRunId}...`);
    await octokit.rest.checks.update({
        owner: owner,
        repo: repo,
        check_run_id: checkRunId,
        status: status,
        conclusion: conclusion,
        details_url: "https://github.com/colpal/actions-pr-comment/pull/15#issuecomment-3206600151",
        output: {
            summary: `Status check concluded with status: ${status}, conclusion: ${conclusion}`,
            title: checkName
        }
    });
}

async function main() {
    const token = core.getInput('github_token', { required: true });

    if (!token) {
        core.setFailed('GITHUB_TOKEN is not available. Ensure the workflow has proper permissions.');
    } else {
        const octokit = github.getOctokit(token);
        const { owner, repo } = github.context.repo;
        const checkName = core.getInput('check_name', { required: true });

        let checkRunId = await initializeStatusCheck(octokit, owner, repo, checkName);

        const commentIdentifier = `<!-- ` + checkName + ` -->`

        let comment = await findComment(octokit, owner, repo, commentIdentifier);
        if (!comment) {
            core.info("No existing comment found, posting a new comment.");
            await postComment(octokit, owner, repo, commentIdentifier);
        } else {
            core.info(`Comment found: ${comment.body}`);
            const updateMode = core.getInput('update_mode', { required: false }) || "create";
            core.info(`Update mode is set to: ${updateMode}`);
            if (updateMode === "create") {
                // await hideComment(comment, "OUTDATED");
                await postComment(octokit, owner, repo, commentIdentifier);
            }
            else {
                await updateComment(octokit, owner, repo, comment, updateMode);
            }
        }

        const status = 'completed';
        const conclusion = 'action_required';
        await finalizeStatusCheck(octokit, owner, repo, checkRunId, checkName, status, conclusion);
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