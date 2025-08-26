const mockGraphql = jest.fn().mockResolvedValue({});
mockGraphql.defaults = () => mockGraphql;
jest.mock('@octokit/graphql', () => ({ graphql: mockGraphql }));
const { hideComment } = require('../src/hide-comment.js');


jest.mock('@actions/core');
jest.mock('@actions/github');

describe('actions-pr-comment', () => {
    let token;
    jest.mock('@octokit/graphql', () => {
        return {
            defaults: () => jest.fn().mockResolvedValue({})
        };
    });
    beforeEach(() => {
        jest.clearAllMocks();
        token = 'test-token';
    });

    it('hideComment: should call graphqlWithAuth without error', async () => {
        const comment = { node_id: 'node123', id: 1 };
        await expect(hideComment(token, comment, 'OUTDATED')).resolves.toBeUndefined();
    });
});


