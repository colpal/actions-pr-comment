const core = require('@actions/core');
const github = require('@actions/github');
const { updateComment } = require('../src/update-comment');

jest.mock('@actions/core');
jest.mock('@actions/github');

describe('update-comment', () => {
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
                    updateComment: jest.fn(),
                },
                checks: {
                    update: jest.fn().mockResolvedValue({})
                }
            }
        };
        github.getOctokit.mockReturnValue(octokit);
    });

    it('updateComment: should replace comment body', async () => {
        core.getInput.mockImplementation((key) => {
            if (key === 'comment_body') return 'Updated comment';
        });
        const comment = { id: 1, body: 'Old', user: { login: 'bot' } };
        await updateComment(octokit, owner, repo, comment, commentIdentifier, 'replace');
        expect(octokit.rest.issues.updateComment).toHaveBeenCalledWith({
            owner,
            repo,
            comment_id: 1,
            body: commentIdentifier + 'Updated comment'
        });
    });

    it('updateComment: should append to comment body', async () => {
        core.getInput.mockImplementation((key) => {
            if (key === 'comment_body') return 'Appended';
        });
        const comment = { id: 2, body: 'Old', user: { login: 'bot' } };
        await updateComment(octokit, owner, repo, comment, commentIdentifier, 'append');
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
        await updateComment(octokit, owner, repo, comment, commentIdentifier, 'append');
        expect(core.setFailed).not.toHaveBeenCalled();
        expect(core.warning).toHaveBeenCalledWith('Not a pull request, skipping review submission.');
    });

    it('updateComment: should fail if updateType is not found', async () => {
        core.getInput.mockImplementation((key) => {
            if (key === 'comment_body') return 'Appended';
        });
        const comment = { id: 4, body: 'Old', user: { login: 'bot' } };
        await updateComment(octokit, owner, repo, comment, commentIdentifier, 'replacement');
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
        await updateComment(octokit, owner, repo, comment, commentIdentifier, 'replace');
        expect(octokit.rest.issues.updateComment).toHaveBeenCalledWith({
            owner,
            repo,
            comment_id: 4,
            body: commentIdentifier + "Test comment"
        });
        expect(core.setFailed).toHaveBeenCalledWith('Resource not accessible by integration');
    });
});


