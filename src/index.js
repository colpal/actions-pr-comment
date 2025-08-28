const { commentWorkflow } = require('./comment/comment-workflow.js');

const { getInput, setFailed } = require("@actions/core");

async function main() {
    const token = getInput('github-token', { required: true });

    if (!token) {
        setFailed('github-token is not available. Ensure the workflow has proper permissions.');
    } else {
        await commentWorkflow(token);
    }
}

module.exports = {
    main
};

main();