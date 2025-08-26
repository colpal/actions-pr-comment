const { findComment } = require('../src/find-comment.js');


const mockGraphql = jest.fn().mockResolvedValue({});
mockGraphql.defaults = () => mockGraphql;
jest.mock('@octokit/graphql', () => ({ graphql: mockGraphql }));
const core = require('@actions/core');
const github = require('@actions/github');
const index = require('../src/index');

jest.mock('@actions/core');
jest.mock('@actions/github');

describe('actions-pr-comment', () => {
    let token, octokit, owner, repo;
    // Mock @octokit/graphql globally
    jest.mock('@octokit/graphql', () => {
        return {
            defaults: () => jest.fn().mockResolvedValue({})
        };
    });
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
                    create: jest.fn()
                },
                checks: {
                    create: jest.fn().mockResolvedValue({ data: { id: 1 } }),
                    update: jest.fn().mockResolvedValue({})
                }
            },
            issues: {
                create: jest.fn()
            }
        };
        github.getOctokit.mockReturnValue(octokit);
    });

    it('commentWorkflow: should run commentWorkflow without error when no previous comment found', async () => {
        jest.spyOn(index, 'findComment').mockResolvedValue(undefined);
        jest.spyOn(index, 'postComment').mockResolvedValue();
        jest.spyOn(index, 'updateComment').mockResolvedValue();
        jest.spyOn(index, 'hideComment').mockResolvedValue();
        github.getOctokit.mockReturnValue(octokit);
        github.context.repo = { owner, repo };
        github.context.payload.pull_request = {
            number: 123,
            head: { sha: 'test-sha' }
        };
        core.getInput.mockImplementation((key) => {
            if (key === 'github_token') return token;
            if (key === 'comment_body') return 'Test comment';
            if (key === 'update_mode') return 'create';
            if (key === 'author') return 'github-actions[bot]';
            if (key === 'comment_identifier') return 'identifier';
            if (key === 'check_name') return 'Test Check';
            return undefined;
        });

        await expect(index.commentWorkflow(octokit, owner, repo, 'identifier')).resolves.toBeUndefined();
    });

    it('commentWorkflow: should update existing comment with `create` (hide old comment and create new one)', async () => {
        jest.mock('./find-comment.js');
        const mockComment = {
            id: 1,
            body: 'Existing comment'
        };
        findComment.mockResolvedValue(mockComment);

        jest.spyOn(index, 'postComment').mockResolvedValue();
        jest.spyOn(index, 'updateComment').mockResolvedValue();
        jest.spyOn(index, 'hideComment').mockResolvedValue();
        github.getOctokit.mockReturnValue(octokit);
        github.context.repo = { owner, repo };
        github.context.payload.pull_request = {
            number: 123,
            head: { sha: 'test-sha' }
        };
        core.getInput.mockImplementation((key) => {
            if (key === 'github_token') return token;
            if (key === 'comment_body') return 'Test comment';
            if (key === 'update_mode') return 'create';
            if (key === 'author') return 'github-actions[bot]';
            if (key === 'comment_identifier') return 'identifier';
            if (key === 'check_name') return 'Test Check';
            return undefined;
        });

        await expect(index.commentWorkflow(octokit, owner, repo, 'identifier'));
        expect(index.hideComment).toHaveBeenCalledWith(
            token,
            comment,
            "OUTDATED"
        );
        expect(index.postComment).toHaveBeenCalledWith(
            octokit,
            owner,
            repo,
            "identifier"
        );
    });

    it('main: should run main without error', async () => {
        jest.spyOn(index, 'findComment').mockResolvedValue(undefined);
        jest.spyOn(index, 'postComment').mockResolvedValue();
        jest.spyOn(index, 'updateComment').mockResolvedValue();
        jest.spyOn(index, 'hideComment').mockResolvedValue();
        github.getOctokit.mockReturnValue(octokit);
        github.context.repo = { owner, repo };
        github.context.payload.pull_request = {
            number: 123,
            head: { sha: 'test-sha' }
        };
        core.getInput.mockImplementation((key) => {
            if (key === 'github_token') return token;
            if (key === 'comment_body') return 'Test comment';
            if (key === 'update_mode') return 'create';
            if (key === 'author') return 'github-actions[bot]';
            if (key === 'comment_identifier') return 'identifier';
            if (key === 'check_name') return 'Test Check';
            return undefined;
        });
        // Pass all required arguments to main
        await expect(index.main(octokit, owner, repo, 'identifier')).resolves.toBeUndefined();
    });
});


