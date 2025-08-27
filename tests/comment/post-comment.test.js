const { postComment } = require('../../src/comment/post-comment');
const core = require('@actions/core');
const github = require('@actions/github');
const { getCommentBody } = require('../../src/util/util');

jest.mock('../../src/util/util', () => ({
    getCommentBody: jest.fn(() => 'mocked body')
}));
jest.mock('@actions/core', () => ({
    info: jest.fn(),
    warning: jest.fn(),
    setFailed: jest.fn()
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
                    createComment: jest.fn()
                }
            }
        };
        jest.clearAllMocks();
        // Reset PR number for each test
        github.context.payload.pull_request.number = 42;
    });

    it('posts a comment successfully', async () => {
        await postComment(octokit, 'owner', 'repo', 'identifier: ');

        expect(core.info).toHaveBeenCalledWith("Starting to post a comment...");
        expect(getCommentBody).toHaveBeenCalled();
        expect(octokit.rest.issues.createComment).toHaveBeenCalledWith({
            owner: 'owner',
            repo: 'repo',
            issue_number: 42,
            body: 'identifier: \nmocked body'
        });
        expect(core.info).toHaveBeenCalledWith("Comment posted successfully.");
    });

    it('skips posting if not a pull request', async () => {
        github.context.payload.pull_request.number = undefined;

        await postComment(octokit, 'owner', 'repo', 'identifier: ');

        expect(core.warning).toHaveBeenCalledWith('Not a pull request, skipping review submission.');
        expect(octokit.rest.issues.createComment).not.toHaveBeenCalled();
    });

    it('handles errors and calls setFailed', async () => {
        octokit.rest.issues.createComment.mockImplementation(() => {
            throw new Error('fail!');
        });

        await postComment(octokit, 'owner', 'repo', 'identifier: ');

        expect(core.setFailed).toHaveBeenCalledWith('fail!');
    });

    it('handles errors thrown by getCommentBody', async () => {
        getCommentBody.mockImplementationOnce(() => { throw new Error('body fail'); });

        await postComment(octokit, 'owner', 'repo', 'identifier: ');

        expect(core.setFailed).toHaveBeenCalledWith('body fail');
        expect(octokit.rest.issues.createComment).not.toHaveBeenCalled();
    });

    it('handles errors when prNumber is null', async () => {
        github.context.payload.pull_request.number = null;

        await postComment(octokit, 'owner', 'repo', 'identifier: ');

        expect(core.warning).toHaveBeenCalledWith('Not a pull request, skipping review submission.');
        expect(octokit.rest.issues.createComment).not.toHaveBeenCalled();
    });

    it('handles errors when prNumber is 0', async () => {
        github.context.payload.pull_request.number = 0;

        await postComment(octokit, 'owner', 'repo', 'identifier: ');

        expect(core.warning).toHaveBeenCalledWith('Not a pull request, skipping review submission.');
        expect(octokit.rest.issues.createComment).not.toHaveBeenCalled();
    });
});
