const core = require("@actions/core");
const github = require("@actions/github");

try {
    const nameToGreet = core.getInput("who-to-greet");
    core.info(`Hello ${nameToGreet}!`);

    const time = new Date().toTimeString();
    core.setOutput("time", time);

    const payload = JSON.stringify(github.context.payload, undefined, 2);
    core.info(`The event payload: ${payload}`);

    let commitId = process.env.GITHUB_SHA || github.context.sha;
    let body = "Test Body";
    let event = "REQUEST_CHANGES";
    const commentBody = {
        "commit_id": commitId,
        "body": body,
        "event": event
    }

    try {
        const response = await fetch(`https://api.github.com/repos/${github.context.repo.owner}/${github.context.repo.repo}/pulls/${github.context.payload.pull_request.number}/reviews`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${process.env.GITHUB_TOKEN}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(commentBody)
        });
    } catch (error) {
        core.setFailed(error.message);
    }

} catch (error) {
    core.setFailed(error.message);
}