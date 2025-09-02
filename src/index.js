const { commentWorkflow } = require('./comment/comment-workflow.js');

const { getInput, setFailed, core } = require("@actions/core");

async function main() {

    const isDebug = process.env['ACTIONS_STEP_DEBUG'] === 'true';
    core.info(`Debug mode is explicitly set to: ${isDebug}`);

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