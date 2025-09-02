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

const core = require('@actions/core');
const github = require('@actions/github');
const { findComment } = require('../../src/comment/find-comment');

describe('findComment', () => {
    let octokit, owner, repo;
    beforeEach(() => {
        jest.clearAllMocks();
        owner = 'owner';
        repo = 'repo';
        github.context = {
            payload: {
                pull_request: {
                    number: 123,
                    head: { sha: 'test-sha' }
                }
            },
            repo: { owner, repo },
            sha: 'fallback-sha'
        };
        octokit = {
            rest: {
                issues: {
                    listComments: jest.fn(),
                }
            }
        };
        github.getOctokit.mockReturnValue(octokit);
        core.getInput.mockReturnValue('');
        core.setOutput.mockReturnValue('');
    });

    it('should find the correct comment', async () => {
        core.getInput.mockImplementation((key) => {
            if (key === 'author') return 'github-actions[bot]';
            return '';
        });
        const comments = [
            { id: 1, user: { login: 'github-actions[bot]' }, body: 'nope' },
            { id: 2, user: { login: 'github-actions[bot]' }, body: 'identifier' }
        ];
        octokit.rest.issues.listComments.mockResolvedValue({ data: comments });
        const result = await findComment(octokit, owner, repo, 'identifier');
        expect(result).toEqual(comments[1]);
        expect(core.setOutput).toHaveBeenCalledWith('comment-id', 2);
    });

    it('should use default author if none supplied', async () => {
        const comments = [
            { id: 1, user: { login: 'github-actions[bot]' }, body: 'nope' },
            { id: 2, user: { login: 'github-actions[bot]' }, body: 'identifier' }
        ];
        octokit.rest.issues.listComments.mockResolvedValue({ data: comments });

        core.getInput.mockImplementation((key) => {
            if (key === 'author') return undefined;
            return '';
        });
        const result = await findComment(octokit, owner, repo, 'identifier');
        expect(result).toEqual(comments[1]);
        expect(core.setOutput).toHaveBeenCalledWith('comment-id', 2);
    });

    it('should return undefined if no matching comment', async () => {
        core.getInput.mockImplementation((key) => {
            if (key === 'author') return 'github-actions[bot]';
            return '';
        });
        const comments = [
            { id: 1, user: { login: 'github-actions[bot]' }, body: 'nope' }
        ];
        octokit.rest.issues.listComments.mockResolvedValue({ data: comments });
        const result = await findComment(octokit, owner, repo, 'notfound');
        expect(result).toBeUndefined();
    });

    it('should fail if prNumber is missing', async () => {
        core.getInput.mockImplementation((key) => {
            if (key === 'author') return 'github-actions[bot]';
            return '';
        });
        const comments = [
            { id: 1, user: { login: 'github-actions[bot]' }, body: 'nope' }
        ];
        github.context.payload.pull_request = '';
        octokit.rest.issues.listComments.mockResolvedValue({ data: comments });

        await expect(findComment(octokit, owner, repo, 'identifier'))
            .rejects.toThrow("No pull request number found in the context.");
    });

    it('should fail if listComments API call fails', async () => {
        const apiError = new Error('Resource not accessible by integration');
        octokit.rest.issues.listComments.mockRejectedValue(apiError);
        core.getInput.mockImplementation((key) => {
            if (key === 'author') return 'github-actions[bot]';
            return '';
        });
        await expect(findComment(octokit, owner, repo, 'identifier'))
            .rejects.toThrow("Resource not accessible by integration");
    });
});

