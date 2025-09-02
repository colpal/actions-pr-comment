const { graphql } = require("@octokit/graphql");
const { logger } = require('../util/logger.js');

/**
 * Hides a GitHub comment by minimizing it using the GraphQL API.
 *
 * @param {string} token - The GitHub authentication token.
 * @param {Object} comment - The comment object containing at least `id` and `node_id`.
 * @param {string} reason - The reason for minimizing the comment (classifier), e.g., 'OUTDATED', 'RESOLVED', etc.
 * @returns {Promise<void>} Resolves when the comment has been minimized.
 */
async function hideComment(token, comment, reason) {
    logger.info(`Hiding comment ${comment.id}...`);
    logger.debug(`Hiding comment with comment id ${comment.id} (node id: ${comment.node_id}) for reason: ${reason}`);
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