const { initializeStatusCheck, finalizeStatusCheck } = require('../../src/status-check/status-check');
const core = require('@actions/core');
const github = require('@actions/github');

jest.mock('@actions/core');
jest.mock('@actions/github');

describe('initializeStatusCheck', () => {
    let octokit;

    beforeEach(() => {
        octokit = {
            rest: {
                checks: {
                    create: jest.fn()
                }
            }
        };
        core.info.mockClear();
        github.context.payload = {};
        github.context.sha = 'defaultsha';
    });

    it('creates a pending check with pull_request head sha', async () => {
        github.context.payload.pull_request = { head: { sha: 'prsha' } };
        octokit.rest.checks.create.mockResolvedValue({ data: { id: 123 } });

        const id = await initializeStatusCheck(octokit, 'owner', 'repo', 'checkName');
        expect(core.info).toHaveBeenCalledWith('Creating a pending check named "checkName"...');
        expect(octokit.rest.checks.create).toHaveBeenCalledWith({
            owner: 'owner',
            repo: 'repo',
            name: 'checkName',
            head_sha: 'prsha',
            status: 'in_progress',
        });
        expect(id).toBe(123);
    });

    it('creates a pending check with context sha if no pull_request', async () => {
        github.context.payload.pull_request = undefined;
        octokit.rest.checks.create.mockResolvedValue({ data: { id: 456 } });

        const id = await initializeStatusCheck(octokit, 'owner', 'repo', 'checkName');
        expect(octokit.rest.checks.create).toHaveBeenCalledWith(expect.objectContaining({
            head_sha: 'defaultsha'
        }));
        expect(id).toBe(456);
    });
});

describe('finalizeStatusCheck', () => {
    let octokit;

    beforeEach(() => {
        octokit = {
            rest: {
                checks: {
                    update: jest.fn()
                }
            }
        };
        core.info.mockClear();
        core.getInput.mockClear();
        core.setFailed.mockClear();
        core.error.mockClear();
    });

    it('finalizes with success conclusion', async () => {
        core.getInput.mockReturnValue('success');
        await finalizeStatusCheck(octokit, 'owner', 'repo', 789, 'checkName');
        expect(core.info).toHaveBeenCalledWith('Finalizing status check with ID: 789...');
        expect(octokit.rest.checks.update).toHaveBeenCalledWith(expect.objectContaining({
            owner: 'owner',
            repo: 'repo',
            check_run_id: 789,
            status: 'completed',
            conclusion: 'success',
            output: expect.objectContaining({
                summary: expect.stringContaining('success'),
                title: 'checkName'
            })
        }));
    });

    it('finalizes with failure conclusion', async () => {
        core.getInput.mockReturnValue('failure');
        await finalizeStatusCheck(octokit, 'owner', 'repo', 101, 'checkName');
        expect(octokit.rest.checks.update).toHaveBeenCalledWith(expect.objectContaining({
            conclusion: 'failure'
        }));
    });

    it('handles invalid conclusion', async () => {
        core.getInput.mockReturnValue('invalid');
        await finalizeStatusCheck(octokit, 'owner', 'repo', 202, 'checkName');
        expect(core.error).toHaveBeenCalledWith('Invalid conclusion: "invalid". Must be \'success\' or \'failure\'.');
        expect(octokit.rest.checks.update).toHaveBeenCalledWith(expect.objectContaining({
            conclusion: 'neutral'
        }));
    });

    it('handles getInput throwing error', async () => {
        core.getInput.mockImplementation(() => { throw new Error('input error'); });
        await finalizeStatusCheck(octokit, 'owner', 'repo', 303, 'checkName');
        expect(core.setFailed).toHaveBeenCalledWith('Failed to get conclusion input: input error');
        expect(octokit.rest.checks.update).not.toHaveBeenCalled();
    });
});