
const mockGraphql = jest.fn().mockResolvedValue({});
mockGraphql.defaults = () => mockGraphql;
jest.mock('@octokit/graphql', () => ({ graphql: mockGraphql }));
const core = require('@actions/core');
const github = require('@actions/github');
const index = require('../src/index');

jest.mock('@actions/core');
jest.mock('@actions/github');

describe('post-comment', () => {
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

    it('postComment: should post a comment on a PR', async () => {
        core.getInput.mockImplementation((key) => {
            if (key === 'comment_body') return 'Test comment';
        });
        await index.postComment(octokit, owner, repo, '<!-- Test Identifier -->');
        expect(octokit.rest.issues.createComment).toHaveBeenCalledWith({
            owner,
            repo,
            issue_number: 123,
            body: 'Test comment<!-- Test Identifier -->'
        });
        expect(core.info).toHaveBeenCalledWith('Comment posted successfully.');
    });

    it('postComment: should fail if prNumber is missing', async () => {
        core.getInput.mockImplementation((key) => {
            if (key === 'comment_body') return 'Test comment';
        });
        github.context.payload.pull_request = '';
        await index.postComment(octokit, owner, repo, 'Test comment');
        expect(core.setFailed).not.toHaveBeenCalled();
        expect(core.warning).toHaveBeenCalledWith('Not a pull request, skipping review submission.');
    });

    it('postComment: should fail if createComment API call fails', async () => {
        const apiError = new Error('Resource not accessible by integration');
        octokit.rest.issues.createComment.mockRejectedValue(apiError);
        core.getInput.mockImplementation((key) => {
            if (key === 'comment_body') return 'Test comment';
        });
        await index.postComment(octokit, owner, repo, '<!-- Test Identifier -->');
        expect(octokit.rest.issues.createComment).toHaveBeenCalledWith({
            owner,
            repo,
            issue_number: 123,
            body: 'Test comment<!-- Test Identifier -->'
        });
        expect(core.setFailed).toHaveBeenCalledWith('Resource not accessible by integration');
    });
});


