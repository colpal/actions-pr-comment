
const core = require('@actions/core');
const github = require('@actions/github');
const { logger } = require('../util/logger.js');

/**
 * Initializes a GitHub status check with a pending state.
 *
 * @param {import('@octokit/rest').Octokit} octokit - The authenticated Octokit instance.
 * @param {string} owner - The owner of the repository.
 * @param {string} repo - The name of the repository.
 * @param {string} checkName - The name of the status check.
 * @returns {Promise<number>} The ID of the created check run.
 */
async function initializeStatusCheck(octokit, owner, repo, checkName) {
    logger.info(`Creating a pending check named "${checkName}"...`);
    const { data: checkRun } = await octokit.rest.checks.create({
        owner: owner,
        repo: repo,
        name: checkName,
        head_sha: github.context.payload.pull_request?.head.sha || github.context.sha,
        status: 'in_progress',
    });
    return checkRun.id;
}


/**
 * Finalizes a GitHub status check by updating its status and conclusion.
 *
 * Retrieves the conclusion value from the GitHub Actions input, validates it,
 * and updates the specified check run with the provided status and conclusion.
 * If the conclusion is invalid, it defaults to 'neutral'.
 *
 * The conclusion value is expected to be set as either 'success' or 'failure'.
 * If another value is provided, it will be set to 'neutral'.
 *
 * @param {import('@octokit/rest').Octokit} octokit - The authenticated Octokit instance.
 * @param {string} owner - The owner of the repository.
 * @param {string} repo - The name of the repository.
 * @param {number} checkRunId - The ID of the check run to update.
 * @param {string} checkName - The name of the status check.
 * @returns {Promise<void>} Resolves when the status check is finalized.
 */
async function finalizeStatusCheck(octokit, owner, repo, checkRunId, checkName) {
    logger.info(`Finalizing completed status check with ID: ${checkRunId}...`);
    const status = "completed";

    let conclusion = core.getInput('conclusion', { required: false }) || "neutral";

    if (conclusion === 'neutral' || conclusion === 'skipped' || conclusion === 'cancelled') {
        conclusion = 'neutral';
    }
    else if (!(conclusion === 'success' || conclusion === 'failure')) {
        logger.error(`Invalid conclusion: "${conclusion}". Must be 'success', 'failure', 'neutral', 'skipped', or 'cancelled'.`);
        conclusion = 'neutral';
    }

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

/**
 * Finalizes a GitHub status check by marking it as failed.
 *
 * Updates the specified check run with a 'completed' status and 'failure' conclusion.
 *
 * @param {import('@octokit/rest').Octokit} octokit - The authenticated Octokit instance.
 * @param {string} owner - The owner of the repository.
 * @param {string} repo - The name of the repository.
 * @param {number} checkRunId - The ID of the check run to update.
 * @param {string} checkName - The name of the status check.
 * @returns {Promise<void>} Resolves when the status check is finalized as failed.
 */
async function failStatusCheck(octokit, owner, repo, checkRunId, checkName) {
    logger.info(`Finalizing failed status check with ID: ${checkRunId}...`);
    const status = "completed";
    const conclusion = "failure"

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

module.exports = { initializeStatusCheck, finalizeStatusCheck, failStatusCheck };