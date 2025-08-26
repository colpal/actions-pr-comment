const core = require('@actions/core');
const github = require('@actions/github');
const { postComment } = require('../src/post-comment');

jest.mock('@actions/core');
jest.mock('@actions/github');

describe('post-comment', () => {
    let octokit, owner, repo, commentIdentifier;
    beforeEach(() => {
        jest.clearAllMocks();
        owner = 'owner';
        repo = 'repo';
        commentIdentifier = '<!-- Test Check -->'
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
                    create: jest.fn()
                },
                checks: {
                    create: jest.fn().mockResolvedValue({ data: { id: 1 } }),
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
        await postComment(octokit, owner, repo, commentIdentifier);
        expect(octokit.rest.issues.createComment).toHaveBeenCalledWith({
            owner,
            repo,
            issue_number: 123,
            body: commentIdentifier + 'Test comment'
        });
        expect(core.info).toHaveBeenCalledWith('Comment posted successfully.');
    });

    it('postComment: should fail if prNumber is missing', async () => {
        core.getInput.mockImplementation((key) => {
            if (key === 'comment_body') return 'Test comment';
        });
        github.context.payload.pull_request = '';
        await postComment(octokit, owner, repo, 'Test comment');
        expect(core.setFailed).not.toHaveBeenCalled();
        expect(core.warning).toHaveBeenCalledWith('Not a pull request, skipping review submission.');
    });

    it('postComment: should fail if createComment API call fails', async () => {
        const apiError = new Error('Resource not accessible by integration');
        octokit.rest.issues.createComment.mockRejectedValue(apiError);
        core.getInput.mockImplementation((key) => {
            if (key === 'comment_body') return 'Test comment';
        });
        await postComment(octokit, owner, repo, commentIdentifier);
        expect(octokit.rest.issues.createComment).toHaveBeenCalledWith({
            owner,
            repo,
            issue_number: 123,
            body: commentIdentifier + 'Test comment'
        });
        expect(core.setFailed).toHaveBeenCalledWith('Resource not accessible by integration');
    });
});


