const { postComment } = require('../../src/comment/post-comment');
const github = require('@actions/github');
const { getCommentBody } = require('../../src/util/util');
const { logger } = require('../../src/util/logger');

jest.mock('../../src/util/util', () => ({
    getCommentBody: jest.fn(() => 'mocked body')
}));
jest.mock('../../src/util/logger', () => ({
    logger: {
        info: jest.fn(),
        debug: jest.fn(),
        error: jest.fn(),
        warning: jest.fn(),
        isVerbose: false
    }
}));
jest.mock('@actions/github', () => ({
    context: {
        payload: {
            pull_request: {
                number: 42
            }
        }
    }
}));

describe('postComment', () => {
    let octokit;

    beforeEach(() => {
        octokit = {
            rest: {
                issues: {
                    createComment: jest.fn().mockResolvedValue({
                        data: {
                            id: 101,
                            node_id: 'MDU6SXNzdWUxMDI=',
                            body: 'identifier: \nconlcusion: success\nmocked body'
                        }
                    })
                }
            }
        };
        jest.clearAllMocks();
        github.context.payload.pull_request.number = 42;
    });

    it('posts a comment successfully', async () => {
        const comment = await postComment(octokit, 'owner', 'repo', 'identifier: ', 'conlcusion: success');

        expect(logger.info).toHaveBeenCalledWith("Starting to post a comment...");
        expect(getCommentBody).toHaveBeenCalled();
        expect(octokit.rest.issues.createComment).toHaveBeenCalledWith({
            owner: 'owner',
            repo: 'repo',
            issue_number: 42,
            body: 'identifier: \nconlcusion: success\nmocked body'
        });
        expect(logger.debug).toHaveBeenCalledWith("Comment posted successfully.");
        expect(comment).toEqual({
            id: 101,
            node_id: 'MDU6SXNzdWUxMDI=',
            body: 'identifier: \nconlcusion: success\nmocked body'
        });
    });

    it('skips posting if not a pull request', async () => {
        github.context.payload.pull_request.number = undefined;

        await expect(postComment(octokit, 'owner', 'repo', 'identifier'))
            .rejects.toThrow("No pull request number found in the context.");
    });

    it('handles errors and calls setFailed', async () => {
        octokit.rest.issues.createComment.mockImplementation(() => {
            throw new Error('fail!');
        });

        await expect(postComment(octokit, 'owner', 'repo', 'identifier'))
            .rejects.toThrow("fail!");
    });

    it('handles errors thrown by getCommentBody', async () => {
        getCommentBody.mockImplementationOnce(() => { throw new Error('body fail'); });

        await expect(postComment(octokit, 'owner', 'repo', 'identifier'))
            .rejects.toThrow("body fail");
    });

    it('handles errors when prNumber is null', async () => {
        github.context.payload.pull_request.number = null;

        await expect(postComment(octokit, 'owner', 'repo', 'identifier'))
            .rejects.toThrow("No pull request number found in the context.");
    });

    it('handles errors when prNumber is 0', async () => {
        github.context.payload.pull_request.number = 0;

        await expect(postComment(octokit, 'owner', 'repo', 'identifier'))
            .rejects.toThrow("No pull request number found in the context.");
    });
});
