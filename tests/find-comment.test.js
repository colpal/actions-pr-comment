const mockGraphql = jest.fn().mockResolvedValue({});
mockGraphql.defaults = () => mockGraphql;
jest.mock('@octokit/graphql', () => ({ graphql: mockGraphql }));
const core = require('@actions/core');
const github = require('@actions/github');
const index = require('../src/index');

jest.mock('@actions/core');
jest.mock('@actions/github');

describe('actions-pr-comment', () => {
    let token, octokit, owner, repo;
    // Mock @octokit/graphql globally
    jest.mock('@octokit/graphql', () => {
        return {
            defaults: () => jest.fn().mockResolvedValue({})
        };
    });
    beforeEach(() => {
        jest.clearAllMocks();
        process.env.GITHUB_TOKEN = 'test-token';
        token = 'test-token';
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
                    createComment: jest.fn(),
                    updateComment: jest.fn(),
                    listComments: jest.fn(),
                    create: jest.fn()
                },
                checks: {
                    create: jest.fn().mockResolvedValue({ data: { id: 1 } }),
                    update: jest.fn().mockResolvedValue({})
                }
            },
            issues: {
                create: jest.fn()
            }
        };
        github.getOctokit.mockReturnValue(octokit);
    });

    it('findComment: should find the correct comment', async () => {
        core.getInput.mockImplementation((key) => {
            if (key === 'author') return 'github-actions[bot]';
        });
        const comments = [
            { id: 1, user: { login: 'github-actions[bot]' }, body: 'nope' },
            { id: 2, user: { login: 'github-actions[bot]' }, body: 'identifier' }
        ];
        octokit.rest.issues.listComments.mockResolvedValue({ data: comments });
        const result = await index.findComment(octokit, owner, repo, 'identifier');
        expect(result).toEqual(comments[1]);
        expect(core.setOutput).toHaveBeenCalledWith('comment_id', 2);
    });

    it('findComment: should use default author if none supplied', async () => {
        const comments = [
            { id: 1, user: { login: 'github-actions[bot]' }, body: 'nope' },
            { id: 2, user: { login: 'github-actions[bot]' }, body: 'identifier' }
        ];
        octokit.rest.issues.listComments.mockResolvedValue({ data: comments });

        core.getInput.mockImplementation((key) => {
            if (key === 'author') return undefined;
        });
        const result = await index.findComment(octokit, owner, repo, 'identifier');
        expect(result).toEqual(comments[1]);
        expect(core.setOutput).toHaveBeenCalledWith('comment_id', 2);
    });

    it('findComment: should return undefined if no matching comment', async () => {
        core.getInput.mockImplementation((key) => {
            if (key === 'author') return 'github-actions[bot]';
        });
        const comments = [
            { id: 1, user: { login: 'github-actions[bot]' }, body: 'nope' }
        ];
        octokit.rest.issues.listComments.mockResolvedValue({ data: comments });
        const result = await index.findComment(octokit, owner, repo, 'notfound');
        expect(result).toBeUndefined();
    });

    it('findComment: should fail if prNumber is missing', async () => {
        core.getInput.mockImplementation((key) => {
            if (key === 'author') return 'github-actions[bot]';
        });
        const comments = [
            { id: 1, user: { login: 'github-actions[bot]' }, body: 'nope' }
        ];
        github.context.payload.pull_request = '';
        octokit.rest.issues.listComments.mockResolvedValue({ data: comments });

        await index.findComment(octokit, owner, repo, 'identifier');
        expect(core.setFailed).not.toHaveBeenCalled();
        expect(core.warning).toHaveBeenCalledWith('Not a pull request, skipping operation.');
    });

    it('findComment: should fail if listComments API call fails', async () => {
        const apiError = new Error('Resource not accessible by integration');
        octokit.rest.issues.listComments.mockRejectedValue(apiError);
        core.getInput.mockImplementation((key) => {
            if (key === 'author') return 'github-actions[bot]';
        });
        await index.findComment(octokit, owner, repo, 'identifier');
        expect(octokit.rest.issues.listComments).toHaveBeenCalledWith({
            owner,
            repo,
            issue_number: 123
        });
        expect(core.setFailed).toHaveBeenCalledWith('Resource not accessible by integration');
    });
});


