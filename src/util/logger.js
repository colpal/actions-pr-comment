// We will lazy-load the core module to ensure it's available in test environments.
let core;

/**
 * A reusable, unified logger class that handles both standard and verbose logging.
 * It respects the 'verbose-logging' action input for debug messages.
 */
class Logger {
    constructor() {
        /**
         * Caches the verbosity setting after it's been read once.
         * @type {boolean | null}
         * @private
         */
        this._isVerbose = null;
    }

    /**
     * Lazily gets the core module, making the logger safe for test environments.
     * @private
     */
    _getCore() {
        if (!core) {
            core = require('@actions/core');
        }
        return core;
    }

    /**
     * Lazily gets the verbosity setting. It only calls core.getInput() once.
     * @type {boolean}
     */
    get isVerbose() {
        if (this._isVerbose === null) {
            // This code now runs on the first call to .debug(), not on module load.
            this._isVerbose = this._getCore().getInput('verbose-logging') === 'true';
        }
        return this._isVerbose;
    }

    /**
     * Logs a standard, always-visible informational message.
     * This is a wrapper around core.info().
     * @param {string} message The message to log.
     */
    info(message) {
        this._getCore().info(message);
    }

    /**
     * Logs a debug message only when verbose-logging is enabled in the workflow.
     * The message is prefixed with [DEBUG] to make it easy to spot.
     * @param {string} message The message to log.
     */
    debug(message) {
        if (this.isVerbose) {
            this._getCore().info(`[DEBUG] ${message}`);
        }
    }

    /**
     * Logs an error message.
     * This is a wrapper around core.error().
     * @param {string} message The error message to log.
     */
    error(message) {
        this._getCore().error(message);
    }

    /**
     * Logs a warning message.
     * This is a wrapper around core.warning().
     * @param {string} message The warning message to log.
     */
    warning(message) {
        this._getCore().warning(message);
    }

    /**
     * Resets the logger's internal state. Should only be used for testing.
     */
    _resetForTesting() {
        core = null;
        this._isVerbose = null;
    }
}

// Export a single, shared instance of the Logger.
module.exports = { logger: new Logger() };