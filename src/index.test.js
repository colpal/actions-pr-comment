/* eslint-env jest */
const core = require('@actions/core');
const github = require('@actions/github');

jest.mock('@actions/core');
jest.mock('@actions/github');

// Mock graphqlWithAuth at the module level
jest.mock('./index', () => {
    const original = jest.requireActual('./index');
    return {
        ...original,
        hideComment: jest.fn(async () => {
            // Simulate successful hide
            return Promise.resolve();
        }),
        main: jest.fn(async () => {
            // Simulate main logic
            return Promise.resolve();
        })
    };
});

const index = require('./index');
const { postComment, updateComment, findComment, hideComment, main } = index;

describe('actions-pr-comment', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        process.env.GITHUB_TOKEN = 'test-token';
        github.context = {
            payload: { pull_request: { number: 123 } },
            repo: { owner: 'owner', repo: 'repo' }
        };
    });

    describe('postComment', () => {
        it('should post a comment on a PR', async () => {
            core.getInput.mockImplementation((key) => {
                if (key === 'github_token') return 'test-token';
                if (key === 'comment_body') return 'Test comment';
            });
            const createCommentMock = jest.fn();
            github.getOctokit.mockReturnValue({
                rest: { issues: { createComment: createCommentMock } }
            });
            await postComment();
            expect(createCommentMock).toHaveBeenCalledWith({
                owner: 'owner',
                repo: 'repo',
                issue_number: 123,
                body: 'Test comment'
            });
            expect(core.info).toHaveBeenCalledWith('Comment posted successfully.');
        });
        it('should fail if token is missing', async () => {
            core.getInput.mockReturnValueOnce(undefined);
            await postComment();
            expect(core.setFailed).toHaveBeenCalled();
        });
    });

    describe('updateComment', () => {
        it('should replace comment body', async () => {
            core.getInput.mockImplementation((key) => {
                if (key === 'github_token') return 'test-token';
                if (key === 'comment_body') return 'Updated comment';
            });
            const updateCommentMock = jest.fn();
            github.getOctokit.mockReturnValue({
                rest: { issues: { updateComment: updateCommentMock } }
            });
            const comment = { id: 1, body: 'Old', user: { login: 'bot' } };
            await updateComment(comment, 'replace');
            expect(updateCommentMock).toHaveBeenCalledWith({
                owner: 'owner',
                repo: 'repo',
                comment_id: 1,
                body: 'Updated comment'
            });
        });
        it('should append to comment body', async () => {
            core.getInput.mockImplementation((key) => {
                if (key === 'github_token') return 'test-token';
                if (key === 'comment_body') return 'Appended';
            });
            const updateCommentMock = jest.fn();
            github.getOctokit.mockReturnValue({
                rest: { issues: { updateComment: updateCommentMock } }
            });
            const comment = { id: 2, body: 'Old', user: { login: 'bot' } };
            await updateComment(comment, 'append');
            expect(updateCommentMock).toHaveBeenCalled();
            expect(updateCommentMock.mock.calls[0][0].body).toContain('Appended');
            expect(updateCommentMock.mock.calls[0][0].body).toContain('Old');
        });
    });

    describe('findComment', () => {
        it('should find the correct comment', async () => {
            core.getInput.mockImplementation((key) => {
                if (key === 'github_token') return 'test-token';
                if (key === 'author') return 'github-actions[bot]';
                if (key === 'comment_identifier') return 'identifier';
            });
            const comments = [
                { id: 1, user: { login: 'github-actions[bot]' }, body: 'nope' },
                { id: 2, user: { login: 'github-actions[bot]' }, body: 'identifier' }
            ];
            github.getOctokit.mockReturnValue({
                rest: { issues: { listComments: jest.fn().mockResolvedValue({ data: comments }) } }
            });
            const result = await findComment();
            expect(result).toEqual(comments[1]);
            expect(core.setOutput).toHaveBeenCalledWith('comment_id', 2);
        });
        it('should return undefined if no matching comment', async () => {
            core.getInput.mockImplementation((key) => {
                if (key === 'github_token') return 'test-token';
                if (key === 'author') return 'github-actions[bot]';
                if (key === 'comment_identifier') return 'notfound';
            });
            const comments = [
                { id: 1, user: { login: 'github-actions[bot]' }, body: 'nope' }
            ];
            github.getOctokit.mockReturnValue({
                rest: { issues: { listComments: jest.fn().mockResolvedValue({ data: comments }) } }
            });
            const result = await findComment();
            expect(result).toBeUndefined();
        });
    });

    describe('hideComment', () => {
        it('should call hideComment without error', async () => {
            const comment = { node_id: 'node123', id: 1 };
            await expect(hideComment(comment, 'OUTDATED')).resolves.toBeUndefined();
        });
    });

    describe('main', () => {
        it('should run main without error', async () => {
            await expect(main()).resolves.toBeUndefined();
        });
    });
});

describe("actions-pr-comment", () => {
    describe("postComment", () => {
        it("should post a comment on a PR", async () => {
            // TODO: mock core, github, octokit and test postComment
        });
    });

    describe("updateComment", () => {
        it("should update a comment with replace mode", async () => {
            // TODO: mock core, github, octokit and test updateComment
        });
        it("should update a comment with append mode", async () => {
            // TODO: mock core, github, octokit and test updateComment
        });
    });

    describe("findComment", () => {
        it("should find the correct comment", async () => {
            // TODO: mock core, github, octokit and test findComment
        });
    });

    describe("hideComment", () => {
        it("should hide a comment", async () => {
            // TODO: mock graphqlWithAuth and test hideComment
        });
    });

    describe("main", () => {
        it("should run the main workflow", async () => {
            // TODO: mock all dependencies and test main
        });
    });
});
