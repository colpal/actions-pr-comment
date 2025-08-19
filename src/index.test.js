
const core = require('@actions/core');
const github = require('@actions/github');
const { graphql } = require('@octokit/graphql');
const index = require('./index');

jest.mock('@actions/core');
jest.mock('@actions/github');

describe('actions-pr-comment', () => {
    let token, octokit, owner, repo;
    beforeEach(() => {
        jest.clearAllMocks();
        process.env.GITHUB_TOKEN = 'test-token';
        token = 'test-token';
        owner = 'owner';
        repo = 'repo';
        github.context = {
            payload: { pull_request: { number: 123 } },
            repo: { owner, repo }
        };
        octokit = {
            rest: {
                issues: {
                    createComment: jest.fn(),
                    updateComment: jest.fn(),
                    listComments: jest.fn()
                }
            }
        };
        github.getOctokit.mockReturnValue(octokit);
    });

    it('postComment: should post a comment on a PR', async () => {
        core.getInput.mockImplementation((key) => {
            if (key === 'comment_body') return 'Test comment';
        });
        await index.postComment(token, octokit, owner, repo);
        expect(octokit.rest.issues.createComment).toHaveBeenCalledWith({
            owner,
            repo,
            issue_number: 123,
            body: 'Test comment'
        });
        expect(core.info).toHaveBeenCalledWith('Comment posted successfully.');
    });

    it('postComment: should fail if token is missing', async () => {
        core.getInput.mockImplementation((key) => {
            if (key === 'github_token') return undefined;
            if (key === 'comment_body') return 'Test comment';
        });
        await index.postComment(undefined, octokit, owner, repo);
        expect(core.setFailed).toHaveBeenCalled();
    });

    it('updateComment: should replace comment body', async () => {
        core.getInput.mockImplementation((key) => {
            if (key === 'comment_body') return 'Updated comment';
        });
        const comment = { id: 1, body: 'Old', user: { login: 'bot' } };
        await index.updateComment(token, octokit, owner, repo, comment, 'replace');
        expect(octokit.rest.issues.updateComment).toHaveBeenCalledWith({
            owner,
            repo,
            comment_id: 1,
            body: 'Updated comment'
        });
    });

    it('updateComment: should append to comment body', async () => {
        core.getInput.mockImplementation((key) => {
            if (key === 'comment_body') return 'Appended';
        });
        const comment = { id: 2, body: 'Old', user: { login: 'bot' } };
        await index.updateComment(token, octokit, owner, repo, comment, 'append');
        expect(octokit.rest.issues.updateComment).toHaveBeenCalled();
        expect(octokit.rest.issues.updateComment.mock.calls[0][0].body).toContain('Appended');
        expect(octokit.rest.issues.updateComment.mock.calls[0][0].body).toContain('Old');
    });

    it('findComment: should find the correct comment', async () => {
        core.getInput.mockImplementation((key) => {
            if (key === 'author') return 'github-actions[bot]';
            if (key === 'comment_identifier') return 'identifier';
        });
        const comments = [
            { id: 1, user: { login: 'github-actions[bot]' }, body: 'nope' },
            { id: 2, user: { login: 'github-actions[bot]' }, body: 'identifier' }
        ];
        octokit.rest.issues.listComments.mockResolvedValue({ data: comments });
        const result = await index.findComment(token, octokit, owner, repo);
        expect(result).toEqual(comments[1]);
        expect(core.setOutput).toHaveBeenCalledWith('comment_id', 2);
    });

    it('findComment: should return undefined if no matching comment', async () => {
        core.getInput.mockImplementation((key) => {
            if (key === 'author') return 'github-actions[bot]';
            if (key === 'comment_identifier') return 'notfound';
        });
        const comments = [
            { id: 1, user: { login: 'github-actions[bot]' }, body: 'nope' }
        ];
        octokit.rest.issues.listComments.mockResolvedValue({ data: comments });
        const result = await index.findComment(token, octokit, owner, repo);
        expect(result).toBeUndefined();
    });

    it('hideComment: should call graphqlWithAuth without error', async () => {
        // Mock graphqlWithAuth to avoid real network call
        const mockGraphqlWithAuth = jest.fn().mockResolvedValue({});
        const comment = { node_id: 'node123', id: 1 };
        await expect(index.hideComment(comment, 'OUTDATED', mockGraphqlWithAuth)).resolves.toBeUndefined();
    });

    it('main: should run main without error', async () => {
        jest.spyOn(index, 'findComment').mockResolvedValue(undefined);
        jest.spyOn(index, 'postComment').mockResolvedValue();
        jest.spyOn(index, 'updateComment').mockResolvedValue();
        jest.spyOn(index, 'hideComment').mockResolvedValue();
        github.getOctokit.mockReturnValue(octokit);
        github.context.repo = { owner, repo };
        github.context.payload = { pull_request: { number: 123 } };
        core.getInput.mockImplementation((key) => {
            if (key === 'github_token') return token;
            if (key === 'comment_body') return 'Test comment';
            if (key === 'update_mode') return 'create';
            if (key === 'author') return 'github-actions[bot]';
            if (key === 'comment_identifier') return 'identifier';
            return undefined;
        });
        await expect(index.main()).resolves.toBeUndefined();
    });
});


