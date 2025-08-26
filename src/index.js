const { findComment } = require('./find-comment.js');
const { hideComment } = require('./hide-comment.js');
const { postComment } = require('./post-comment.js');
const { updateComment } = require('./update-comment.js');

const core = require("@actions/core");
const github = require("@actions/github");

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
        output: {
            summary: `Status check concluded with status: ${status}, conclusion: ${conclusion}`,
            title: checkName
        }
    });
}

async function commentWorkflow(token) {
    const octokit = github.getOctokit(token);
    const { owner, repo } = github.context.repo;
    const checkName = core.getInput('check_name', { required: true });

    let checkRunId = await initializeStatusCheck(octokit, owner, repo, checkName);

    const commentIdentifier = `<!-- ` + checkName + ` -->`;

    let comment = await findComment(octokit, owner, repo, commentIdentifier);
    if (!comment) {
        core.info("No existing comment found, posting a new comment.");
        await postComment(octokit, owner, repo, commentIdentifier);
    } else {
        core.info(`Comment found: ${comment.body}`);
        const updateMode = core.getInput('update_mode', { required: false }) || "create";
        core.info(`Update mode is set to: ${updateMode}`);
        if (updateMode === "create") {
            await hideComment(token, comment, "OUTDATED");
            await postComment(octokit, owner, repo, commentIdentifier);
        }
        else {
            await updateComment(octokit, owner, repo, comment, updateMode);
        }
    }

    const status = 'completed';
    const conclusion = core.getInput('conclusion', { required: true });
    await finalizeStatusCheck(octokit, owner, repo, checkRunId, checkName, status, conclusion);
}

async function main() {
    const token = core.getInput('github_token', { required: true });

    if (!token) {
        core.setFailed('GITHUB_TOKEN is not available. Ensure the workflow has proper permissions.');
    } else {
        await commentWorkflow(token);
    }
}

module.exports = {
    postComment,
    updateComment,
    findComment,
    hideComment,
    initializeStatusCheck,
    finalizeStatusCheck,
    commentWorkflow,
    main
};

main();