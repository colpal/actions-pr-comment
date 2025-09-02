const core = require('@actions/core');
const { main } = require('../src/index');
const { commentWorkflow } = require('../src/comment/comment-workflow');
jest.mock('@actions/core');
jest.mock('../src/comment/comment-workflow');

describe('main', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should call core.setFailed if github-token is not provided', async () => {
        core.getInput.mockReturnValue('');
        await main();
        expect(core.setFailed).toHaveBeenCalledWith(
            'github-token is not available. Ensure the workflow has proper permissions.'
        );
        expect(commentWorkflow).not.toHaveBeenCalled();
    });

    it('should call commentWorkflow if github-token is provided', async () => {
        core.getInput.mockReturnValue('fake-token');
        await main();
        expect(commentWorkflow).toHaveBeenCalledWith('fake-token');
        expect(core.setFailed).not.toHaveBeenCalled();
    });
});