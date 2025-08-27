const github = require('@actions/github');
const { initializeStatusCheck, finalizeStatusCheck } = require('../src/status-check');

jest.mock('@actions/core');
jest.mock('@actions/github');

describe('status-check', () => {
    let octokit, owner, repo, checkName;
    beforeEach(() => {
        jest.clearAllMocks();
        checkName = 'Test Check';
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
                    updateComment: jest.fn(),
                },
                checks: {
                    create: jest.fn().mockResolvedValue({ data: { id: 42 } }),
                    update: jest.fn().mockResolvedValue({})
                }
            }
        };
        github.getOctokit.mockReturnValue(octokit);
    });
    it('initializeStatusCheck: uses head.sha when present', async () => {

        const result = await initializeStatusCheck(octokit, owner, repo, checkName);
        expect(octokit.rest.checks.create).toHaveBeenCalledWith({
            owner,
            repo,
            name: checkName,
            head_sha: 'test-sha',
            status: 'in_progress',
        });
        expect(result).toBe(42);
    });

    it('initializeStatusCheck: uses context.sha when head.sha is not present', async () => {
        github.context.payload = {
            pull_request: undefined
        };
        const octokit = {
            rest: {
                checks: {
                    create: jest.fn().mockResolvedValue({ data: { id: 99 } })
                }
            }
        };
        const checkName = 'Test Check';
        const result = await initializeStatusCheck(octokit, owner, repo, checkName);
        expect(octokit.rest.checks.create).toHaveBeenCalledWith({
            owner,
            repo,
            name: checkName,
            head_sha: 'fallback-sha',
            status: 'in_progress',
        });
        expect(result).toBe(99);
    });

    it('finalizeStatusCheck: should call octokit.rest.checks.update with correct arguments', async () => {
        const checkRunId = 42;
        const status = 'completed';
        const conclusion = 'success';
        await finalizeStatusCheck(octokit, owner, repo, checkRunId, checkName, status, conclusion);
        expect(octokit.rest.checks.update).toHaveBeenCalledWith({
            owner,
            repo,
            check_run_id: checkRunId,
            status: status,
            conclusion: conclusion,
            output: {
                summary: `Status check concluded with status: ${status}, conclusion: ${conclusion}`,
                title: checkName
            }
        });
    });
});