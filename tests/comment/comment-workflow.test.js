const core = require('@actions/core');
const github = require('@actions/github');
const { findComment } = require('../../src/comment/find-comment.js');
const { postComment } = require('../../src/comment/post-comment.js');
const { updateComment } = require('../../src/comment/update-comment.js');
const { hideComment } = require('../../src/comment/hide-comment.js');
const { initializeStatusCheck, finalizeStatusCheck } = require('../../src/status-check/status-check.js');
const { commentWorkflow } = require('../../src/comment/comment-workflow.js');

jest.mock('../../src/comment/find-comment.js');
jest.mock('../../src/comment/post-comment.js');
jest.mock('../../src/comment/update-comment.js');
jest.mock('../../src/comment/hide-comment.js');
jest.mock('../../src/status-check/status-check.js');
jest.mock('@actions/core');
jest.mock('@actions/github');

describe('comment-workflow', () => {
    let token, octokit, owner, repo;

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
    });

    it('should call initializeStatusCheck and finalizeStatusCheck with correct arguments', async () => {
        findComment.mockResolvedValue(undefined);
        postComment.mockResolvedValue();
        core.getInput.mockImplementation((key) => {
            if (key === 'check_name') return 'Test Check';
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
            if (key === 'check_name') return 'Test Check';
            if (key === 'conclusion') return 'success';
            return undefined;
        });
        core.info.mockClear();
        await commentWorkflow(token);
        expect(core.info).toHaveBeenCalledWith("No existing comment found, posting a new comment.");
    });

    it('should log info when existing comment is found', async () => {
        const mockComment = { id: 1, body: 'Existing comment' };
        findComment.mockResolvedValue(mockComment);
        updateComment.mockResolvedValue();
        hideComment.mockResolvedValue();
        core.getInput.mockImplementation((key) => {
            if (key === 'check_name') return 'Test Check';
            if (key === 'update_mode') return 'replace';
            if (key === 'conclusion') return 'success';
            return undefined;
        });
        core.info.mockClear();
        await commentWorkflow(token);
        expect(core.info).toHaveBeenCalledWith(`Comment found: ${mockComment.body}`);
        expect(core.info).toHaveBeenCalledWith(`Update mode is set to: replace`);
    });

    it('should handle error thrown by findComment', async () => {
        findComment.mockRejectedValue(new Error('findComment error'));
        core.getInput.mockImplementation((key) => {
            if (key === 'check_name') return 'Test Check';
            if (key === 'conclusion') return 'success';
            return undefined;
        });
        await expect(commentWorkflow(token)).rejects.toThrow('findComment error');
    });

    it('should handle error thrown by postComment', async () => {
        findComment.mockResolvedValue(undefined);
        postComment.mockRejectedValue(new Error('postComment error'));
        core.getInput.mockImplementation((key) => {
            if (key === 'check_name') return 'Test Check';
            if (key === 'conclusion') return 'success';
            return undefined;
        });
        await expect(commentWorkflow(token)).rejects.toThrow('postComment error');
    });

    it('should handle error thrown by updateComment', async () => {
        const mockComment = { id: 1, body: 'Existing comment' };
        findComment.mockResolvedValue(mockComment);
        updateComment.mockRejectedValue(new Error('updateComment error'));
        hideComment.mockResolvedValue();
        core.getInput.mockImplementation((key) => {
            if (key === 'check_name') return 'Test Check';
            if (key === 'update_mode') return 'replace';
            if (key === 'conclusion') return 'success';
            return undefined;
        });
        await expect(commentWorkflow(token)).rejects.toThrow('updateComment error');
    });

    it('should handle error thrown by hideComment', async () => {
        const mockComment = { id: 1, body: 'Existing comment' };
        findComment.mockResolvedValue(mockComment);
        updateComment.mockResolvedValue();
        hideComment.mockRejectedValue(new Error('hideComment error'));
        core.getInput.mockImplementation((key) => {
            if (key === 'check_name') return 'Test Check';
            if (key === 'update_mode') return 'create';
            if (key === 'conclusion') return 'success';
            return undefined;
        });
        await expect(commentWorkflow(token)).rejects.toThrow('hideComment error');
    });

    it('should handle error thrown by initializeStatusCheck', async () => {
        initializeStatusCheck.mockRejectedValue(new Error('init error'));
        findComment.mockResolvedValue(undefined);
        postComment.mockResolvedValue();
        core.getInput.mockImplementation((key) => {
            if (key === 'check_name') return 'Test Check';
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
            if (key === 'check_name') return 'Test Check';
            if (key === 'conclusion') return 'success';
            return undefined;
        });
        await expect(commentWorkflow(token)).rejects.toThrow('finalize error');
    });

    it('should call hideComment and postComment when update_mode is "create"', async () => {
        const mockComment = { id: 1, body: 'Existing comment' };
        findComment.mockResolvedValue(mockComment);
        hideComment.mockResolvedValue();
        postComment.mockResolvedValue();
        updateComment.mockResolvedValue();
        core.getInput.mockImplementation((key) => {
            if (key === 'check_name') return 'Test Check';
            if (key === 'update_mode') return 'create';
            if (key === 'conclusion') return 'success';
            return undefined;
        });
        await commentWorkflow(token);
        expect(hideComment).toHaveBeenCalledWith(token, mockComment, "OUTDATED");
        expect(postComment).toHaveBeenCalledWith(octokit, owner, repo, '<!-- Test Check -->');
        expect(updateComment).not.toHaveBeenCalled();
    });

    it('should default update_mode to "create" when getInput does not return a value', async () => {
        const mockComment = { id: 2, body: 'Another comment' };
        findComment.mockResolvedValue(mockComment);
        hideComment.mockResolvedValue();
        postComment.mockResolvedValue();
        updateComment.mockResolvedValue();
        // Simulate getInput not returning update_mode
        core.getInput.mockImplementation((key) => {
            if (key === 'check_name') return 'Test Check';
            if (key === 'update_mode') return undefined;
            if (key === 'conclusion') return 'success';
            return undefined;
        });
        await commentWorkflow(token);
        // Should default to "create" and call hideComment and postComment
        expect(hideComment).toHaveBeenCalledWith(token, mockComment, "OUTDATED");
        expect(postComment).toHaveBeenCalledWith(octokit, owner, repo, '<!-- Test Check -->');
        expect(updateComment).not.toHaveBeenCalled();
        expect(core.info).toHaveBeenCalledWith('Update mode is set to: create');
    });
});
