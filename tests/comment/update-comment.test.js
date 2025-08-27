const core = require('@actions/core');
const github = require('@actions/github');
const { updateComment } = require('../../src/comment/update-comment');

// Mock getCommentBody from util/util
jest.mock('../../src/util/util', () => ({
    getCommentBody: jest.fn(() => 'Mocked body')
}));

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

    it('should replace comment body', async () => {
        const comment = { id: 1, body: 'Old', user: { login: 'bot' } };
        await updateComment(octokit, owner, repo, comment, commentIdentifier, 'replace');
        expect(octokit.rest.issues.updateComment).toHaveBeenCalledWith({
            owner,
            repo,
            comment_id: 1,
            body: commentIdentifier + 'Mocked body'
        });
        expect(core.info).toHaveBeenCalledWith("Replacing comment body.");
        expect(core.info).toHaveBeenCalledWith("Comment updated successfully.");
    });

    it('should append to comment body', async () => {
        const comment = { id: 2, body: 'Old', user: { login: 'bot' } };
        await updateComment(octokit, owner, repo, comment, commentIdentifier, 'append');
        expect(octokit.rest.issues.updateComment).toHaveBeenCalled();
        const body = octokit.rest.issues.updateComment.mock.calls[0][0].body;
        expect(body).toContain('Mocked body');
        expect(body).toContain('Old');
        expect(body).toMatch(/\*Update posted on:/);
        expect(core.info).toHaveBeenCalledWith("Appending to comment body.");
        expect(core.info).toHaveBeenCalledWith("Comment updated successfully.");
    });

    it('should fail if prNumber is missing', async () => {
        core.getInput.mockImplementation((key) => {
            if (key === 'comment_body') return 'Appended';
        });
        const comment = { id: 3, body: 'Old', user: { login: 'bot' } };
        github.context.payload.pull_request = '';
        await updateComment(octokit, owner, repo, comment, commentIdentifier, 'append');
        expect(core.setFailed).not.toHaveBeenCalled();
        expect(core.warning).toHaveBeenCalledWith('Not a pull request, skipping review submission.');
    });
    it('should warn if updateType is unknown', async () => {
        const comment = { id: 4, body: 'Old', user: { login: 'bot' } };
        await updateComment(octokit, owner, repo, comment, commentIdentifier, 'unknown');
        expect(core.warning).toHaveBeenCalledWith('Unknown update type: unknown');
        expect(octokit.rest.issues.updateComment).not.toHaveBeenCalled();
    });

    it('should call setFailed if updateComment API throws', async () => {
        const apiError = new Error('Resource not accessible by integration');
        octokit.rest.issues.updateComment.mockRejectedValue(apiError);
        const comment = { id: 5, body: 'Test comment', user: { login: 'bot' } };
        await updateComment(octokit, owner, repo, comment, commentIdentifier, 'replace');
        expect(core.setFailed).toHaveBeenCalledWith('Resource not accessible by integration');
    });

    it('should handle missing comment body gracefully for append', async () => {
        const comment = { id: 6, body: '', user: { login: 'bot' } };
        await updateComment(octokit, owner, repo, comment, commentIdentifier, 'append');
        expect(octokit.rest.issues.updateComment).toHaveBeenCalled();
        const body = octokit.rest.issues.updateComment.mock.calls[0][0].body;
        expect(body).toContain('Mocked body');
        expect(body).toContain('\n\n---\n\n');
    });

    it('should not update comment if octokit is missing', async () => {
        const comment = { id: 7, body: 'Old', user: { login: 'bot' } };
        await expect(updateComment(undefined, owner, repo, comment, commentIdentifier, 'replace')).resolves.toBeUndefined();
        expect(core.setFailed).toHaveBeenCalled();
    });

    it('should not update comment if comment is missing', async () => {
        await expect(updateComment(octokit, owner, repo, undefined, commentIdentifier, 'replace')).resolves.toBeUndefined();
        expect(core.setFailed).toHaveBeenCalled();
    });

    it('should call setFailed if octokit is null', async () => {
        const comment = { id: 9, body: 'Old', user: { login: 'bot' } };
        await updateComment(null, owner, repo, comment, commentIdentifier, 'replace');
        expect(core.setFailed).toHaveBeenCalled();
    });

    it('should call setFailed if comment is null', async () => {
        await updateComment(octokit, owner, repo, null, commentIdentifier, 'replace');
        expect(core.setFailed).toHaveBeenCalled();
    });
});
