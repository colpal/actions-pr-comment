const core = require('@actions/core');
const logger = require('../../src/util/logger');
jest.mock('@actions/core');

describe('Logger', () => {
    beforeEach(() => {
        jest.clearAllMocks();

        logger._resetForTesting();
    });

    describe('info', () => {
        it('should call core.info with the provided message', () => {
            const message = 'Test info message';

            logger.info(message);

            expect(core.info).toHaveBeenCalledWith(message);
            expect(core.info).toHaveBeenCalledTimes(1);
        });
    });

    describe('error', () => {
        it('should call core.error with the provided message', () => {
            const message = 'Test error message';

            logger.error(message);

            expect(core.error).toHaveBeenCalledWith(message);
            expect(core.error).toHaveBeenCalledTimes(1);
        });
    });

    describe('warning', () => {
        it('should call core.warning with the provided message', () => {
            const message = 'Test warning message';

            logger.warning(message);

            expect(core.warning).toHaveBeenCalledWith(message);
            expect(core.warning).toHaveBeenCalledTimes(1);
        });
    });

    describe('debug', () => {
        it('should log debug message when verbose-logging is true', () => {
            const message = 'Test debug message';
            core.getInput.mockReturnValue('true');

            logger.debug(message);

            expect(core.getInput).toHaveBeenCalledWith('verbose-logging');
            expect(core.info).toHaveBeenCalledWith(`[DEBUG] ${message}`);
            expect(core.info).toHaveBeenCalledTimes(1);
        });

        it('should not log debug message when verbose-logging is false', () => {
            const message = 'Test debug message';
            core.getInput.mockReturnValue('false');

            logger.debug(message);

            expect(core.getInput).toHaveBeenCalledWith('verbose-logging');
            expect(core.info).not.toHaveBeenCalled();
        });

        it('should not log debug message when verbose-logging is not set', () => {
            const message = 'Test debug message';
            core.getInput.mockReturnValue('');

            logger.debug(message);

            expect(core.getInput).toHaveBeenCalledWith('verbose-logging');
            expect(core.info).not.toHaveBeenCalled();
        });

        it('should cache verbosity setting and not call getInput multiple times', () => {
            const message1 = 'First debug message';
            const message2 = 'Second debug message';
            core.getInput.mockReturnValue('true');

            logger.debug(message1);
            logger.debug(message2);

            expect(core.getInput).toHaveBeenCalledWith('verbose-logging');
            expect(core.getInput).toHaveBeenCalledTimes(1);
            expect(core.info).toHaveBeenCalledWith(`[DEBUG] ${message1}`);
            expect(core.info).toHaveBeenCalledWith(`[DEBUG] ${message2}`);
            expect(core.info).toHaveBeenCalledTimes(2);
        });
    });

    describe('isVerbose getter', () => {
        it('should return true when verbose-logging is true', () => {
            core.getInput.mockReturnValue('true');

            const result = logger.isVerbose;

            expect(result).toBe(true);
            expect(core.getInput).toHaveBeenCalledWith('verbose-logging');
        });

        it('should return false when verbose-logging is false', () => {
            core.getInput.mockReturnValue('false');

            const result = logger.isVerbose;

            expect(result).toBe(false);
            expect(core.getInput).toHaveBeenCalledWith('verbose-logging');
        });

        it('should return false when verbose-logging is not set', () => {
            core.getInput.mockReturnValue('');

            const result = logger.isVerbose;

            expect(result).toBe(false);
            expect(core.getInput).toHaveBeenCalledWith('verbose-logging');
        });

        it('should cache the result and not call getInput multiple times', () => {
            core.getInput.mockReturnValue('true');

            const result1 = logger.isVerbose;
            const result2 = logger.isVerbose;

            expect(result1).toBe(true);
            expect(result2).toBe(true);
            expect(core.getInput).toHaveBeenCalledTimes(1);
        });
    });

    describe('_resetForTesting', () => {
        it('should reset internal state and allow re-initialization', () => {
            // First, set verbose to true
            core.getInput.mockReturnValue('true');
            expect(logger.isVerbose).toBe(true);
            expect(core.getInput).toHaveBeenCalledTimes(1);

            // Reset for testing
            logger._resetForTesting();

            // Change mock return value and test again
            core.getInput.mockReturnValue('false');
            expect(logger.isVerbose).toBe(false);
            expect(core.getInput).toHaveBeenCalledTimes(2);
        });
    });

    describe('lazy loading of core module', () => {
        it('should work correctly after reset', () => {
            // Reset to simulate fresh import
            logger._resetForTesting();

            const message = 'Test after reset';

            logger.info(message);

            expect(core.info).toHaveBeenCalledWith(message);
        });
    });
});