jest.mock('@actions/core');
jest.mock('@actions/github');
jest.mock('../../src/comment/find-comment.js');
jest.mock('../../src/comment/post-comment.js');
jest.mock('../../src/comment/update-comment.js');
jest.mock('../../src/comment/comment-visibility.js');
jest.mock('../../src/status-check/status-check.js');
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
const { commentWorkflow } = require('../../src/comment/comment-workflow.js');
const { logger } = require('../../src/util/logger');
const { findComment } = require('../../src/comment/find-comment.js');
const { postComment } = require('../../src/comment/post-comment.js');
const { updateComment } = require('../../src/comment/update-comment.js');
const { hideComment, unhideComment } = require('../../src/comment/comment-visibility.js');
const { initializeStatusCheck, finalizeStatusCheck, failStatusCheck } = require('../../src/status-check/status-check.js');

describe('comment-workflow', () => {
    let token, octokit, owner, repo, commentIdentifier, conclusionIdentifier;

    beforeEach(() => {
        jest.clearAllMocks();
        token = 'test-token';
        owner = 'owner';
        repo = 'repo';
        commentIdentifier = "<!-- Test Check -->";
        conclusionIdentifier = "<!-- CONCLUSION: success -->";
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
                },
                checks: {
                    create: jest.fn().mockResolvedValue({ data: { id: 1 } }),
                    update: jest.fn().mockResolvedValue({})
                }
            }
        };
        github.getOctokit.mockReturnValue(octokit);
        initializeStatusCheck.mockResolvedValue(42);
        finalizeStatusCheck.mockResolvedValue();
        failStatusCheck.mockResolvedValue();
    });

    it('should call initializeStatusCheck and finalizeStatusCheck with correct arguments', async () => {
        findComment.mockResolvedValue(undefined);
        postComment.mockResolvedValue();
        core.getInput.mockImplementation((key) => {
            if (key === 'comment-id') return 'Test Check';
            if (key === 'conclusion') return 'success';
            return undefined;
        });

        await commentWorkflow(token);

        expect(initializeStatusCheck).toHaveBeenCalledWith(octokit, owner, repo, 'Test Check');
        expect(finalizeStatusCheck).toHaveBeenCalledWith(octokit, owner, repo, 42, 'Test Check');
    });

    it('should log info when no existing comment is found', async () => {
        findComment.mockResolvedValue(undefined);
        postComment.mockResolvedValue();
        core.getInput.mockImplementation((key) => {
            if (key === 'comment-id') return 'Test Check';
            if (key === 'conclusion') return 'success';
            return undefined;
        });

        await commentWorkflow(token);

        expect(logger.debug).toHaveBeenCalledWith("No existing comment found, posting a new comment.");
    });

    it('should log info when existing comment is found', async () => {
        const mockComment = { id: 1, body: 'Existing comment' };
        findComment.mockResolvedValue(mockComment);
        updateComment.mockResolvedValue();
        hideComment.mockResolvedValue();
        core.getInput.mockImplementation((key) => {
            if (key === 'comment-id') return 'Test Check';
            if (key === 'update-mode') return 'replace';
            if (key === 'conclusion') return 'success';
            return undefined;
        });

        await commentWorkflow(token);

        expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('Comment found. ID: 1. Update Mode: replace'));
    });

    it('should call hideComment and postComment when update-mode is "create"', async () => {
        const mockComment = { id: 1, body: 'Existing comment' };
        findComment.mockResolvedValue(mockComment);
        hideComment.mockResolvedValue();
        postComment.mockResolvedValue();
        updateComment.mockResolvedValue();
        core.getInput.mockImplementation((key) => {
            if (key === 'comment-id') return 'Test Check';
            if (key === 'update-mode') return 'create';
            if (key === 'conclusion') return 'success';
            return undefined;
        });

        await commentWorkflow(token);

        expect(hideComment).toHaveBeenCalledWith(token, mockComment, "OUTDATED");
        expect(postComment).toHaveBeenCalledWith(octokit, owner, repo, '<!-- Test Check -->', conclusionIdentifier);
        expect(updateComment).not.toHaveBeenCalled();
    });

    it('should default update-mode to "create" when getInput does not return a value', async () => {
        const mockComment = { id: 2, body: 'Another comment' };
        findComment.mockResolvedValue(mockComment);
        hideComment.mockResolvedValue();
        postComment.mockResolvedValue();
        updateComment.mockResolvedValue();
        core.getInput.mockImplementation((key) => {
            if (key === 'comment-id') return 'Test Check';
            if (key === 'update-mode') return undefined;
            if (key === 'conclusion') return 'success';
            return undefined;
        });

        await commentWorkflow(token);

        expect(hideComment).toHaveBeenCalledWith(token, mockComment, "OUTDATED");
        expect(postComment).toHaveBeenCalledWith(octokit, owner, repo, '<!-- Test Check -->', conclusionIdentifier);
        expect(updateComment).not.toHaveBeenCalled();
    });

    // Main workflow tests
    it('should handle error thrown by findComment', async () => {
        findComment.mockRejectedValue(new Error('findComment error'));
        core.getInput.mockImplementation((key) => {
            if (key === 'comment-id') return 'Test Check';
            if (key === 'conclusion') return 'success';
            return undefined;
        });

        await expect(commentWorkflow(token)).resolves.toBeUndefined();

        expect(failStatusCheck).toHaveBeenCalled();
        expect(findComment).toHaveBeenCalledWith(octokit, owner, repo, commentIdentifier);
        expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Error occurred during comment workflow: findComment error'));
        expect(failStatusCheck).toHaveBeenCalledWith(octokit, owner, repo, expect.anything(), 'Test Check');
    });

    it('should handle error thrown by postComment', async () => {
        findComment.mockResolvedValue(undefined);
        postComment.mockRejectedValue(new Error('postComment error'));
        core.getInput.mockImplementation((key) => {
            if (key === 'comment-id') return 'Test Check';
            if (key === 'conclusion') return 'success';
            return undefined;
        });

        await expect(commentWorkflow(token)).resolves.toBeUndefined();

        expect(failStatusCheck).toHaveBeenCalled();
        expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('No existing comment found, posting a new comment.'));
        expect(postComment).toHaveBeenCalledWith(octokit, owner, repo, commentIdentifier, conclusionIdentifier);
        expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Error occurred during comment workflow: postComment error'));
        expect(failStatusCheck).toHaveBeenCalledWith(octokit, owner, repo, expect.anything(), 'Test Check');
    });

    it('should handle error thrown by updateComment', async () => {
        const mockComment = { id: 1, body: 'Existing comment' };
        findComment.mockResolvedValue(mockComment);
        updateComment.mockRejectedValue(new Error('updateComment error'));
        hideComment.mockResolvedValue();
        core.getInput.mockImplementation((key) => {
            if (key === 'comment-id') return 'Test Check';
            if (key === 'update-mode') return 'replace';
            if (key === 'conclusion') return 'success';
            return undefined;
        });

        await expect(commentWorkflow(token)).resolves.toBeUndefined();

        expect(failStatusCheck).toHaveBeenCalled();
        expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('Comment found. ID: 1. Update Mode: replace'));
        expect(updateComment).toHaveBeenCalledWith(octokit, owner, repo, mockComment, commentIdentifier, 'replace', conclusionIdentifier);
        expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Error occurred during comment workflow: updateComment error'));
        expect(failStatusCheck).toHaveBeenCalledWith(octokit, owner, repo, expect.anything(), 'Test Check');
    });

    it('should handle error thrown by hideComment and call failStatusCheck', async () => {
        const mockComment = { id: 1, body: 'Existing comment' };
        findComment.mockResolvedValue(mockComment);
        updateComment.mockResolvedValue();
        hideComment.mockRejectedValue(new Error('hideComment error'));
        postComment.mockResolvedValue();
        core.getInput.mockImplementation((key) => {
            if (key === 'comment-id') return 'Test Check';
            if (key === 'update-mode') return 'create';
            if (key === 'conclusion') return 'success';
            return undefined;
        });

        await expect(commentWorkflow(token)).resolves.toBeUndefined();

        expect(failStatusCheck).toHaveBeenCalled();
        expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('Comment found. ID: 1. Update Mode: create'));
        expect(hideComment).toHaveBeenCalledWith(token, mockComment, "OUTDATED");
        expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Error occurred during comment workflow: hideComment error'));
        expect(postComment).not.toHaveBeenCalled();
        expect(failStatusCheck).toHaveBeenCalledWith(octokit, owner, repo, expect.anything(), 'Test Check');
    });

    it('should handle error thrown by initializeStatusCheck', async () => {
        initializeStatusCheck.mockRejectedValue(new Error('init error'));
        findComment.mockResolvedValue(undefined);
        postComment.mockResolvedValue();
        core.getInput.mockImplementation((key) => {
            if (key === 'comment-id') return 'Test Check';
            if (key === 'conclusion') return 'success';
            return undefined;
        });

        await expect(commentWorkflow(token)).rejects.toThrow('init error');
    });

    it('should handle error thrown by finalizeStatusCheck', async () => {
        findComment.mockResolvedValue(undefined);
        postComment.mockResolvedValue();
        finalizeStatusCheck.mockRejectedValue(new Error('finalize error'));
        core.getInput.mockImplementation((key) => {
            if (key === 'comment-id') return 'Test Check';
            if (key === 'conclusion') return 'success';
            return undefined;
        });

        await expect(commentWorkflow(token)).resolves.toBeUndefined();

        expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Error occurred during comment workflow: finalize error'));
        expect(failStatusCheck).toHaveBeenCalledWith(octokit, owner, repo, expect.anything(), 'Test Check');
    });
    it('should call hideComment when conclusion is success and on-resolution-hide is true', async () => {
        const mockComment = { id: 1, body: 'Existing comment' };
        findComment.mockResolvedValue(mockComment);
        updateComment.mockResolvedValue();
        hideComment.mockResolvedValue();
        core.getInput.mockImplementation((key) => {
            if (key === 'comment-id') return 'Test Check';
            if (key === 'update-mode') return 'replace';
            if (key === 'conclusion') return 'success';
            if (key === 'on-resolution-hide') return 'true';
            return undefined;
        });

        await commentWorkflow(token);

        expect(hideComment).toHaveBeenCalledWith(token, mockComment, "RESOLVED");
        expect(logger.debug).toHaveBeenCalledWith("Existing comment hidden as RESOLVED due to success conclusion.");
    });

    it('should not call hideComment when conclusion is failure and on-resolution-hide is true', async () => {
        const mockComment = { id: 1, body: 'Existing comment' };
        findComment.mockResolvedValue(mockComment);
        updateComment.mockResolvedValue();
        hideComment.mockResolvedValue();
        core.getInput.mockImplementation((key) => {
            if (key === 'comment-id') return 'Test Check';
            if (key === 'update-mode') return 'replace';
            if (key === 'conclusion') return 'failure';
            if (key === 'on-resolution-hide') return 'true';
            return undefined;
        });

        await commentWorkflow(token);

        expect(hideComment).not.toHaveBeenCalled();
        expect(logger.debug).not.toHaveBeenCalledWith("Existing comment hidden as RESOLVED due to success conclusion.");
    });

    it('should not call hideComment when on-resolution-hide is false', async () => {
        const mockComment = { id: 1, body: 'Existing comment' };
        findComment.mockResolvedValue(mockComment);
        updateComment.mockResolvedValue();
        hideComment.mockResolvedValue();
        core.getInput.mockImplementation((key) => {
            if (key === 'comment-id') return 'Test Check';
            if (key === 'update-mode') return 'replace';
            if (key === 'conclusion') return 'success';
            if (key === 'on-resolution-hide') return 'false';
            return undefined;
        });

        await commentWorkflow(token);

        expect(hideComment).not.toHaveBeenCalled();
        expect(logger.debug).not.toHaveBeenCalledWith("Existing comment hidden as RESOLVED due to success conclusion.");
    });


    it('should not call unhideComment when conclusion is success and on-resolution-hide is true', async () => {
        const mockComment = { id: 1, body: 'Existing comment' };
        findComment.mockResolvedValue(mockComment);
        updateComment.mockResolvedValue();
        unhideComment.mockResolvedValue();
        core.getInput.mockImplementation((key) => {
            if (key === 'comment-id') return 'Test Check';
            if (key === 'update-mode') return 'replace';
            if (key === 'conclusion') return 'success';
            if (key === 'on-resolution-hide') return 'true';
            return undefined;
        });

        await commentWorkflow(token);

        expect(unhideComment).not.toHaveBeenCalled();
        expect(logger.debug).not.toHaveBeenCalledWith("Existing comment unhidden due to failure conclusion.");
    });

    it('should not call unhideComment when conclusion is success and on-resolution-hide is false', async () => {
        const mockComment = { id: 1, body: 'Existing comment' };
        findComment.mockResolvedValue(mockComment);
        updateComment.mockResolvedValue();
        unhideComment.mockResolvedValue();
        core.getInput.mockImplementation((key) => {
            if (key === 'comment-id') return 'Test Check';
            if (key === 'update-mode') return 'replace';
            if (key === 'conclusion') return 'success';
            if (key === 'on-resolution-hide') return 'false';
            return undefined;
        });

        await commentWorkflow(token);

        expect(unhideComment).not.toHaveBeenCalled();
        expect(logger.debug).not.toHaveBeenCalledWith("Existing comment unhidden due to failure conclusion.");
    });

    it('should not call unhideComment when conclusion is failure and on-resolution-hide is false', async () => {
        const mockComment = { id: 1, body: 'Existing comment' };
        findComment.mockResolvedValue(mockComment);
        updateComment.mockResolvedValue();
        unhideComment.mockResolvedValue();
        core.getInput.mockImplementation((key) => {
            if (key === 'comment-id') return 'Test Check';
            if (key === 'update-mode') return 'replace';
            if (key === 'conclusion') return 'failure';
            if (key === 'on-resolution-hide') return 'false';
            return undefined;
        });

        await commentWorkflow(token);

        expect(unhideComment).not.toHaveBeenCalled();
        expect(logger.debug).not.toHaveBeenCalledWith("Existing comment unhidden due to failure conclusion.");
    });

    it('should call unhideComment when conclusion is failure and on-resolution-hide is true', async () => {
        const mockComment = { id: 1, body: 'Existing comment' };
        findComment.mockResolvedValue(mockComment);
        updateComment.mockResolvedValue();
        unhideComment.mockResolvedValue();
        core.getInput.mockImplementation((key) => {
            if (key === 'comment-id') return 'Test Check';
            if (key === 'update-mode') return 'replace';
            if (key === 'conclusion') return 'failure';
            if (key === 'on-resolution-hide') return 'true';
            return undefined;
        });

        await commentWorkflow(token);

        expect(unhideComment).toHaveBeenCalledWith(token, mockComment);
        expect(logger.debug).toHaveBeenCalledWith("Existing comment unhidden due to failure conclusion.");
    });

    it('should not call unhideComment when conclusion is success and on-resolution-hide is true', async () => {
        const mockComment = { id: 1, body: 'Existing comment' };
        findComment.mockResolvedValue(mockComment);
        updateComment.mockResolvedValue();
        unhideComment.mockResolvedValue();
        core.getInput.mockImplementation((key) => {
            if (key === 'comment-id') return 'Test Check';
            if (key === 'update-mode') return 'replace';
            if (key === 'conclusion') return 'success';
            if (key === 'on-resolution-hide') return 'true';
            return undefined;
        });

        await commentWorkflow(token);

        expect(unhideComment).not.toHaveBeenCalled();
        expect(logger.debug).not.toHaveBeenCalledWith("Existing comment unhidden due to failure conclusion.");
    });

    it('should call unhideComment when conclusion is failure and on-resolution-hide is true', async () => {
        const mockComment = { id: 1, body: 'Existing comment' };
        findComment.mockResolvedValue(mockComment);
        updateComment.mockResolvedValue();
        unhideComment.mockResolvedValue();
        core.getInput.mockImplementation((key) => {
            if (key === 'comment-id') return 'Test Check';
            if (key === 'update-mode') return 'replace';
            if (key === 'conclusion') return 'failure';
            if (key === 'on-resolution-hide') return 'true';
            return undefined;
        });

        await commentWorkflow(token);

        expect(unhideComment).toHaveBeenCalledWith(token, mockComment);
        expect(logger.debug).toHaveBeenCalledWith("Existing comment unhidden due to failure conclusion.");
    });

    it('should not call unhideComment when on-resolution-hide is false', async () => {
        const mockComment = { id: 1, body: 'Existing comment' };
        findComment.mockResolvedValue(mockComment);
        updateComment.mockResolvedValue();
        unhideComment.mockResolvedValue();
        core.getInput.mockImplementation((key) => {
            if (key === 'comment-id') return 'Test Check';
            if (key === 'update-mode') return 'replace';
            if (key === 'conclusion') return 'failure';
            if (key === 'on-resolution-hide') return 'false';
            return undefined;
        });

        await commentWorkflow(token);

        expect(unhideComment).not.toHaveBeenCalled();
        expect(logger.debug).not.toHaveBeenCalledWith("Existing comment unhidden due to failure conclusion.");
    });
});
