const core = require('@actions/core');
const github = require('@actions/github');
const { updateComment } = require('../../src/comment/update-comment');
const { logger } = require('../../src/util/logger');

jest.mock('../../src/util/util', () => ({
    getCommentBody: jest.fn(() => 'Mocked body')
}));
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
        await updateComment(octokit, owner, repo, comment, commentIdentifier, 'replace', 'conlcusion: success');
        expect(octokit.rest.issues.updateComment).toHaveBeenCalledWith({
            owner,
            repo,
            comment_id: 1,
            body: commentIdentifier + "\n" + 'conlcusion: success' + "\n" + 'Mocked body'
        });
        expect(logger.debug).toHaveBeenCalledWith("Replacing comment body.");
        expect(logger.debug).toHaveBeenCalledWith("Comment updated successfully.");
    });

    it('should append to comment body', async () => {
        const comment = { id: 2, body: 'Old', user: { login: 'bot' } };
        await updateComment(octokit, owner, repo, comment, commentIdentifier, 'append');
        expect(octokit.rest.issues.updateComment).toHaveBeenCalled();
        const body = octokit.rest.issues.updateComment.mock.calls[0][0].body;
        expect(body).toContain('Mocked body');
        expect(body).toContain('Old');
        expect(body).toMatch(/\*Update posted on:/);
        expect(logger.debug).toHaveBeenCalledWith("Appending to comment body.");
        expect(logger.debug).toHaveBeenCalledWith("Comment updated successfully.");
    });

    it('should fail if prNumber is missing', async () => {
        core.getInput.mockImplementation((key) => {
            if (key === 'comment-body') return 'Appended';
        });
        const comment = { id: 3, body: 'Old', user: { login: 'bot' } };
        github.context.payload.pull_request = '';
        await expect(updateComment(octokit, owner, repo, comment, commentIdentifier, 'replace'))
            .rejects.toThrow("No pull request number found in the context.");
    });

    it('should warn if updateType is unknown', async () => {
        const comment = { id: 4, body: 'Old', user: { login: 'bot' } };
        await expect(updateComment(octokit, owner, repo, comment, commentIdentifier, 'unknown'))
            .rejects.toThrow("Unknown update type: unknown");
    });

    it('should call setFailed if updateComment API throws', async () => {
        const apiError = new Error('Resource not accessible by integration');
        octokit.rest.issues.updateComment.mockRejectedValue(apiError);
        const comment = { id: 5, body: 'Test comment', user: { login: 'bot' } };
        await expect(updateComment(octokit, owner, repo, comment, commentIdentifier, 'replace'))
            .rejects.toThrow("Resource not accessible by integration");
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
        await expect(updateComment(undefined, owner, repo, comment, commentIdentifier, 'replace'))
            .rejects.toThrow("Cannot read properties of undefined (reading 'rest')");
    });

    it('should not update comment if comment is missing', async () => {
        await expect(updateComment(octokit, owner, repo, undefined, commentIdentifier, 'replace'))
            .rejects.toThrow("Cannot read properties of undefined (reading 'id')");
    });

    it('should call setFailed if octokit is null', async () => {
        const comment = { id: 9, body: 'Old', user: { login: 'bot' } };
        await expect(updateComment(null, owner, repo, comment, commentIdentifier, 'replace'))
            .rejects.toThrow("Cannot read properties of null (reading 'rest'");
    });

    it('should throw error if comment is null', async () => {
        await expect(updateComment(octokit, owner, repo, null, commentIdentifier, 'replace'))
            .rejects.toThrow("Cannot read properties of null (reading 'id'");
    });

    it('should ensure only one <!-- CONCLUSION... value exists in the body when appending', async () => {
        const comment = { id: 10, body: 'Old <!-- CONCLUSION: failure -->', user: { login: 'bot' } };
        await updateComment(octokit, owner, repo, comment, commentIdentifier, 'append', '<!-- CONCLUSION: success -->');
        expect(octokit.rest.issues.updateComment).toHaveBeenCalled();
        const body = octokit.rest.issues.updateComment.mock.calls[0][0].body;
        expect(body).toContain('Mocked body');
        expect(body).toContain('Old');
        expect(body).toContain('<!-- CONCLUSION: success -->');
        expect(body).not.toContain('<!-- CONCLUSION: failure -->');
        expect((body.match(/<!-- CONCLUSION:/g) || []).length).toBe(1);
    });
});
