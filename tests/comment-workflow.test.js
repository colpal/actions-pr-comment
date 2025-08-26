const core = require('@actions/core');
const github = require('@actions/github');
const { findComment } = require('../src/find-comment.js');
const { postComment } = require('../src/post-comment.js');
const { updateComment } = require('../src/update-comment.js');
const { hideComment } = require('../src/hide-comment.js');
const { commentWorkflow } = require('../src/comment-workflow.js');
jest.mock('../src/find-comment.js');
jest.mock('../src/post-comment.js');
jest.mock('../src/update-comment.js');
jest.mock('../src/hide-comment.js');


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
    });
    it('commentWorkflow: should update existing comment with `create` (hide old comment and create new one)', async () => {
        const mockComment = { id: 1, body: 'Existing comment' };

        findComment.mockResolvedValue(mockComment);
        postComment.mockResolvedValue();
        updateComment.mockResolvedValue();
        hideComment.mockResolvedValue();
        core.getInput.mockImplementation((key) => {
            if (key === 'github_token') return token;
            if (key === 'check_name') return 'Test Check';
            if (key === 'update_mode') return 'create';
            if (key === 'conclusion') return 'success';
            return undefined;
        });
        await commentWorkflow(token);
        expect(hideComment).toHaveBeenCalledWith(token, mockComment, 'OUTDATED');
        expect(postComment).toHaveBeenCalledWith(octokit, owner, repo, '<!-- Test Check -->');
        expect(updateComment).not.toHaveBeenCalled();
    });

    it('commentWorkflow: should update existing comment with `create` when no update_mode found', async () => {
        const mockComment = { id: 1, body: 'Existing comment' };

        findComment.mockResolvedValue(mockComment);
        postComment.mockResolvedValue();
        updateComment.mockResolvedValue();
        hideComment.mockResolvedValue();

        core.getInput.mockImplementation((key) => {
            if (key === 'github_token') return token;
            if (key === 'check_name') return 'Test Check';
            if (key === 'update_mode') return undefined;
            if (key === 'conclusion') return 'success';
            return undefined;
        });
        await commentWorkflow(token);
        expect(hideComment).toHaveBeenCalledWith(token, mockComment, 'OUTDATED');
        expect(postComment).toHaveBeenCalledWith(octokit, owner, repo, '<!-- Test Check -->');
        expect(updateComment).not.toHaveBeenCalled();
    });

    it('commentWorkflow: should update existing comment with `append` (add to end of existing comment)', async () => {
        const mockComment = { id: 1, body: 'Existing comment' };

        findComment.mockResolvedValue(mockComment);
        postComment.mockResolvedValue();
        updateComment.mockResolvedValue();
        hideComment.mockResolvedValue();
        core.getInput.mockImplementation((key) => {
            if (key === 'github_token') return token;
            if (key === 'check_name') return 'Test Check';
            if (key === 'update_mode') return 'append';
            if (key === 'conclusion') return 'success';
            return undefined;
        });
        await commentWorkflow(token);
        expect(hideComment).not.toHaveBeenCalled();
        expect(postComment).not.toHaveBeenCalled();
        expect(updateComment).toHaveBeenCalledWith(octokit, owner, repo, mockComment, 'append');
    });

    it('commentWorkflow: should update existing comment with `replace` (override existing comment)', async () => {
        const mockComment = { id: 1, body: 'Existing comment' };

        findComment.mockResolvedValue(mockComment);
        postComment.mockResolvedValue();
        updateComment.mockResolvedValue();
        hideComment.mockResolvedValue();
        core.getInput.mockImplementation((key) => {
            if (key === 'github_token') return token;
            if (key === 'check_name') return 'Test Check';
            if (key === 'update_mode') return 'replace';
            if (key === 'conclusion') return 'success';
            return undefined;
        });
        await commentWorkflow(token);
        expect(hideComment).not.toHaveBeenCalled();
        expect(postComment).not.toHaveBeenCalled();
        expect(updateComment).toHaveBeenCalledWith(octokit, owner, repo, mockComment, 'replace');
    });

    it('commentWorkflow: should create new comment when no previous comment found', async () => {
        findComment.mockResolvedValue(undefined);
        postComment.mockResolvedValue();
        updateComment.mockResolvedValue();
        hideComment.mockResolvedValue();
        core.getInput.mockImplementation((key) => {
            if (key === 'github_token') return token;
            if (key === 'check_name') return 'Test Check';
            if (key === 'update_mode') return 'create';
            if (key === 'conclusion') return 'success';
            return undefined;
        });
        await commentWorkflow(token);
        expect(findComment).toHaveBeenCalledWith(octokit, owner, repo, '<!-- Test Check -->');
        expect(postComment).toHaveBeenCalledWith(octokit, owner, repo, '<!-- Test Check -->');
        expect(hideComment).not.toHaveBeenCalled();
        expect(updateComment).not.toHaveBeenCalled();
    });

});