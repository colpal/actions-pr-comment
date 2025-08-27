const core = require('@actions/core');
const github = require('@actions/github');
const { initializeStatusCheck, finalizeStatusCheck } = require('../status-check/status-check.js');
const { findComment } = require('./find-comment.js');
const { updateComment } = require('./update-comment.js');
const { hideComment } = require('./hide-comment.js');
const { postComment } = require('./post-comment.js');


/**
 * Executes the workflow for managing pull request comments and status checks.
 * 
 * This function initializes a status check, finds or creates a PR comment identified by the check name,
 * and then determines how to handle the comment based on its existence and the update mode:
 *   - If no existing comment is found, a new comment is posted.
 *   - If a comment exists:
 *       - If update mode is "create", the existing comment is hidden as "OUTDATED" and a new comment is posted.
 *       - Otherwise, the existing comment is updated according to the specified update mode.
 * Finally, the status check is finalized with the provided conclusion.
 *
 * @async
 * @param {string} token - GitHub authentication token.
 * @returns {Promise<void>} Resolves when the workflow is complete.
 */
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
            await updateComment(octokit, owner, repo, comment, commentIdentifier, updateMode);
        }
    }

    await finalizeStatusCheck(octokit, owner, repo, checkRunId, checkName);
}

module.exports = { commentWorkflow };