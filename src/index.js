const { commentWorkflow } = require('./comment/comment-workflow.js');

const { getInput, setFailed } = require("@actions/core");
const core = require('@actions/core');


async function main() {

    const stepDebug = process.env['ACTIONS_STEP_DEBUG'] === 'true';
    const runnerDebug = process.env['ACTIONS_RUNNER_DEBUG'] === 'true';
    core.info(`Step debug mode is explicitly set to: ${stepDebug}`);
    core.info(`Runner debug mode is explicitly set to: ${runnerDebug}`);

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