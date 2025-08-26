const core = require('@actions/core');
const github = require('@actions/github');


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

module.exports = { initializeStatusCheck, finalizeStatusCheck };