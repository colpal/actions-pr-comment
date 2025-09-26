const { initializeStatusCheck, finalizeStatusCheck, failStatusCheck } = require('../../src/status-check/status-check');
const core = require('@actions/core');
const github = require('@actions/github');
const { logger } = require('../../src/util/logger');

jest.mock('@actions/core');
jest.mock('@actions/github');
jest.mock('../../src/util/logger', () => ({
    logger: {
        info: jest.fn(),
        debug: jest.fn(),
        error: jest.fn(),
        warning: jest.fn(),
        isVerbose: false
    }
}));


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
        github.context.payload = {};
        github.context.sha = 'defaultsha';
    });

    it('creates a pending check with pull_request head sha', async () => {
        github.context.payload.pull_request = { head: { sha: 'prsha' } };
        octokit.rest.checks.create.mockResolvedValue({ data: { id: 123 } });

        const id = await initializeStatusCheck(octokit, 'owner', 'repo', 'checkName');
        expect(logger.info).toHaveBeenCalledWith('Creating a pending check named "checkName"...');
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
        core.getInput.mockClear();
        core.setFailed.mockClear();
        logger.info.mockClear();
    });

    it('finalizes with success conclusion', async () => {
        core.getInput.mockReturnValue('success');
        await finalizeStatusCheck(octokit, 'owner', 'repo', 789, 'checkName');
        expect(logger.info).toHaveBeenCalledWith('Finalizing completed status check with ID: 789...');
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

    it('finalizes with success conclusion if skipped supplied', async () => {
        core.getInput.mockReturnValue('skipped');
        await finalizeStatusCheck(octokit, 'owner', 'repo', 102, 'checkName');
        expect(octokit.rest.checks.update).toHaveBeenCalledWith(expect.objectContaining({
            conclusion: 'success'
        }));
    });

    it('finalizes with neutral conclusion if cancelled supplied', async () => {
        core.getInput.mockReturnValue('cancelled');
        await finalizeStatusCheck(octokit, 'owner', 'repo', 102, 'checkName');
        expect(octokit.rest.checks.update).toHaveBeenCalledWith(expect.objectContaining({
            conclusion: 'neutral'
        }));
    });


    it('finalizes with neutral conclusion', async () => {
        core.getInput.mockReturnValue('neutral');
        await finalizeStatusCheck(octokit, 'owner', 'repo', 102, 'checkName');
        expect(octokit.rest.checks.update).toHaveBeenCalledWith(expect.objectContaining({
            conclusion: 'neutral'
        }));
    });

    it('defaults to neutral if no conclusion provided', async () => {
        core.getInput.mockReturnValue('');
        await finalizeStatusCheck(octokit, 'owner', 'repo', 103, 'checkName');
        expect(octokit.rest.checks.update).toHaveBeenCalledWith(expect.objectContaining({
            conclusion: 'neutral'
        }));
    });

    it('handles invalid conclusion', async () => {
        core.getInput.mockReturnValue('invalid');
        await finalizeStatusCheck(octokit, 'owner', 'repo', 202, 'checkName');
        expect(logger.error).toHaveBeenCalledWith('Invalid conclusion: \"invalid\". Must be \'success\', \'failure\', \'neutral\', \'skipped\', or \'cancelled\'.');
        expect(octokit.rest.checks.update).toHaveBeenCalledWith(expect.objectContaining({
            conclusion: 'neutral'
        }));
    });

    describe('failStatusCheck', () => {
        let octokit;

        beforeEach(() => {
            octokit = {
                rest: {
                    checks: {
                        update: jest.fn()
                    }
                }
            };
            logger.info.mockClear();
        });

        it('finalizes with failure conclusion', async () => {
            await failStatusCheck(octokit, 'owner', 'repo', 555, 'failCheck');
            expect(logger.info).toHaveBeenCalledWith('Finalizing failed status check with ID: 555...');
            expect(octokit.rest.checks.update).toHaveBeenCalledWith(expect.objectContaining({
                owner: 'owner',
                repo: 'repo',
                check_run_id: 555,
                status: 'completed',
                conclusion: 'failure',
                output: expect.objectContaining({
                    summary: expect.stringContaining('failure'),
                    title: 'failCheck'
                })
            }));
        });
    });
});