const { main } = require('../src/index');
const { commentWorkflow } = require('../src/comment-workflow');
const core = require('@actions/core');

jest.mock('@actions/core');
jest.mock('../src/comment-workflow');

describe('main', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('calls setFailed if github_token is not provided', async () => {
        core.getInput.mockReturnValue('');
        await main();
        expect(core.setFailed).toHaveBeenCalledWith(
            'GITHUB_TOKEN is not available. Ensure the workflow has proper permissions.'
        );
        expect(commentWorkflow).not.toHaveBeenCalled();
    });

    it('calls commentWorkflow if github_token is provided', async () => {
        core.getInput.mockReturnValue('fake-token');
        await main();
        expect(commentWorkflow).toHaveBeenCalledWith('fake-token');
        expect(core.setFailed).not.toHaveBeenCalled();
    });
});