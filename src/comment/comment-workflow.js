const core = require('@actions/core');
const github = require('@actions/github');
const { findComment } = require('./find-comment.js');
const { updateComment } = require('./update-comment.js');
const { hideComment, unhideComment } = require('./comment-visibility.js');
const { postComment } = require('./post-comment.js');
const { logger } = require('../util/logger.js');


/**
 * Executes the workflow for managing pull request comments.
 *
 * This function finds or creates a PR comment identified by the check name,
 * and then determines how to handle the comment based on its existence and the update mode:
 *   - If no existing comment is found, a new comment is posted.
 *   - If a comment exists:
 *       - If update mode is "create", the existing comment is hidden as "OUTDATED" and a new comment is posted.
 *       - Otherwise, the existing comment is updated according to the specified update mode.
 *
 * @async
 * @param {string} token - GitHub authentication token.
 * @returns {Promise<void>} Resolves when the workflow is complete.
 */
async function commentWorkflow(token) {
    const octokit = github.getOctokit(token);
    const { owner, repo } = github.context.repo;
    const conclusion = core.getInput('conclusion', { required: true });

    if (conclusion === 'cancelled') {
        logger.debug("Conclusion is 'cancelled', skipping comment workflow.");
        return;
    }

    const conclusionIdentifier = `<!-- CONCLUSION: ` + conclusion + ` -->`;

    const checkName = core.getInput('comment-id', { required: true });
    const commentIdentifier = `<!-- ` + checkName + ` -->`;

    try {
        let comment = await findComment(octokit, owner, repo, commentIdentifier);

        if (!comment) {

            if (conclusion === 'skipped') {
                logger.debug("Conclusion is 'skipped' and no existing comment found, skipping comment workflow.");
                return;
            } else {
                logger.debug("No existing comment found, posting a new comment.");
                await postComment(octokit, owner, repo, commentIdentifier, conclusionIdentifier);
            }

        } else {
            const updateMode = core.getInput('update-mode', { required: false }) || "create";
            logger.debug(`Comment found. ID: ${comment.id}. Update Mode: ${updateMode}`);

            if (conclusion === 'skipped') {
                logger.debug("Conclusion is 'skipped', skipping comment update.");

                if (core.getInput('on-resolution-hide', { required: false }) === 'true') {
                    logger.debug("Existing comment hidden as OUTDATED due to skip conclusion.");
                    await hideComment(token, comment, "OUTDATED");
                }

                return;
            }

            if (updateMode === "create") {
                await hideComment(token, comment, "OUTDATED");
                logger.debug("Existing comment hidden as OUTDATED. Posting a new comment.");
                await postComment(octokit, owner, repo, commentIdentifier, conclusionIdentifier);
                logger.debug("New comment posted successfully.");
            }
            else if (updateMode === "none") {
                logger.debug("Update mode is 'none', skipping comment update.");
            }
            else {
                await updateComment(octokit, owner, repo, comment, commentIdentifier, updateMode, conclusionIdentifier);
                logger.debug("Existing comment updated successfully.");

                if (core.getInput('on-resolution-hide', { required: false }) === 'true') {

                    if (conclusion === 'success') {
                        await hideComment(token, comment, "RESOLVED");
                        logger.debug("Existing comment hidden as RESOLVED due to success conclusion.");
                    }

                    if (conclusion === 'failure') {
                        await unhideComment(token, comment);
                        logger.debug("Existing comment unhidden due to failure conclusion.");
                    }

                }
            }
        }

    } catch (error) {
        logger.error(`Error occurred during comment workflow: ${error.message}`);
    }
}

module.exports = { commentWorkflow };