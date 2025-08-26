
const mockGraphql = jest.fn().mockResolvedValue({});
mockGraphql.defaults = () => mockGraphql;
jest.mock('@octokit/graphql', () => ({ graphql: mockGraphql }));
const core = require('@actions/core');
const github = require('@actions/github');
const index = require('../src/index');

jest.mock('@actions/core');
jest.mock('@actions/github');

describe('update-comment', () => {
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

    it('updateComment: should replace comment body', async () => {
        core.getInput.mockImplementation((key) => {
            if (key === 'comment_body') return 'Updated comment';
        });
        const comment = { id: 1, body: 'Old', user: { login: 'bot' } };
        await index.updateComment(octokit, owner, repo, comment, 'replace');
        expect(octokit.rest.issues.updateComment).toHaveBeenCalledWith({
            owner,
            repo,
            comment_id: 1,
            body: 'Updated comment'
        });
    });

    it('updateComment: should append to comment body', async () => {
        core.getInput.mockImplementation((key) => {
            if (key === 'comment_body') return 'Appended';
        });
        const comment = { id: 2, body: 'Old', user: { login: 'bot' } };
        await index.updateComment(octokit, owner, repo, comment, 'append');
        expect(octokit.rest.issues.updateComment).toHaveBeenCalled();
        expect(octokit.rest.issues.updateComment.mock.calls[0][0].body).toContain('Appended');
        expect(octokit.rest.issues.updateComment.mock.calls[0][0].body).toContain('Old');
    });

    it('updateComment: should fail if prNumber is missing', async () => {
        core.getInput.mockImplementation((key) => {
            if (key === 'comment_body') return 'Appended';
        });
        const comment = { id: 3, body: 'Old', user: { login: 'bot' } };
        github.context.payload.pull_request = '';
        await index.updateComment(octokit, owner, repo, comment, 'append');
        expect(core.setFailed).not.toHaveBeenCalled();
        expect(core.warning).toHaveBeenCalledWith('Not a pull request, skipping review submission.');
    });

    it('updateComment: should fail if updateType is not found', async () => {
        core.getInput.mockImplementation((key) => {
            if (key === 'comment_body') return 'Appended';
        });
        const comment = { id: 4, body: 'Old', user: { login: 'bot' } };
        await index.updateComment(octokit, owner, repo, comment, 'replacement');
        expect(core.setFailed).not.toHaveBeenCalled();
        expect(core.warning).toHaveBeenCalledWith('Unknown update type: replacement');
    });

    it('updateComment: should fail if updateComment API call fails', async () => {
        const apiError = new Error('Resource not accessible by integration');
        octokit.rest.issues.updateComment.mockRejectedValue(apiError);
        core.getInput.mockImplementation((key) => {
            if (key === 'comment_body') return 'Test comment';
        });
        const comment = { id: 4, body: 'Test comment', user: { login: 'bot' } };
        await index.updateComment(octokit, owner, repo, comment, 'replace');
        expect(octokit.rest.issues.updateComment).toHaveBeenCalledWith({
            owner,
            repo,
            comment_id: 4,
            body: "Test comment"
        });
        expect(core.setFailed).toHaveBeenCalledWith('Resource not accessible by integration');
    });
});


