const { getCommentBody } = require("./util");

const core = require("@actions/core");
const github = require("@actions/github");

async function updateComment(octokit, owner, repo, comment, commentIdentifier, updateType) {
    core.info("Starting to update a comment...");
    try {
        let newCommentBody = getCommentBody();

        const prNumber = github.context.payload.pull_request.number;

        if (!prNumber) {
            core.warning('Not a pull request, skipping review submission.');
            return;
        }

        let commentBody = ""
        switch (updateType) {
            case "replace":
                core.info("Replacing comment body.");
                commentBody = commentIdentifier + newCommentBody;
                break;
            case "append": {
                core.info("Appending to comment body.");
                const timestamp = new Date().toUTCString();
                const divider = `\n\n---\n\n*Update posted on: ${timestamp}*\n\n`;
                commentBody = comment.body + divider + newCommentBody; // dont need comment identifier here since it is already on the comment
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

module.exports = { updateComment };