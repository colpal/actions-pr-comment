const { commentWorkflow } = require('./comment/comment-workflow.js');

const { getInput, setFailed } = require("@actions/core");

async function main() {
    const token = getInput('github_token', { required: true });

    if (!token) {
        setFailed('GITHUB_TOKEN is not available. Ensure the workflow has proper permissions.');
    } else {
        await commentWorkflow(token);
    }
}

module.exports = {
    main
};

main();