const { graphql } = require("@octokit/graphql");
const core = require('@actions/core');

async function hideComment(token, comment, reason) {
    core.info(`Hiding comment with comment id ${comment.id} (node id: ${comment.node_id}) for reason: ${reason}`);
    const graphqlWithAuth = graphql.defaults({
        headers: {
            authorization: `token ${token}`,
        },
    });

    await graphqlWithAuth(
        `
        mutation minimizeComment($subjectId: ID!, $classifier: ReportedContentClassifiers!) {
            minimizeComment(input: { subjectId: $subjectId, classifier: $classifier }) {
                clientMutationId
                minimizedComment {
                    isMinimized
                    minimizedReason
                    viewerCanMinimize
                }
            }
        }
        `,
        {
            subjectId: comment.node_id,
            classifier: reason,
        }
    );
}

module.exports = { hideComment };