jest.mock('@actions/core');
jest.mock('@actions/github');
jest.mock('../../src/util/logger', () => ({
    logger: {
        info: jest.fn(),
        debug: jest.fn(),
        error: jest.fn(),
        warning: jest.fn(),
        isVerbose: false
    }
}));
const mockGraphql = jest.fn().mockResolvedValue({});
mockGraphql.defaults = () => mockGraphql;
jest.mock('@octokit/graphql', () => ({ graphql: mockGraphql }));
const { hideComment } = require('../../src/comment/hide-comment');

describe('hideComment', () => {
    let token;
    beforeEach(() => {
        jest.clearAllMocks();
        token = 'test-token';
    });

    it('should call graphqlWithAuth without error', async () => {
        const comment = { node_id: 'node123', id: 1 };
        await expect(hideComment(token, comment, 'OUTDATED')).resolves.toBeUndefined();
    });
});


