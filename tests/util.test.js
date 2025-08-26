const { getCommentBody } = require('../src/util');
const core = require('@actions/core');
const fs = require('fs');

jest.mock('@actions/core');
jest.mock('fs', () => ({
    readFileSync: jest.fn(),
    promises: {
        access: jest.fn()
    },
    O_RDONLY: 0,
    constants: {
        O_RDONLY: 0
    }
}));

describe('getCommentBody', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('returns direct comment when only comment_body is provided', () => {
        core.getInput.mockImplementation((key) => key === 'comment_body' ? 'Direct comment' : '');
        expect(getCommentBody()).toBe('Direct comment');
    });

    it('reads comment body from file when only comment_body_path is provided', () => {
        core.getInput.mockImplementation((key) => key === 'comment_body_path' ? 'path/to/file.txt' : '');
        fs.readFileSync.mockReturnValue('File comment');
        expect(getCommentBody()).toBe('File comment');
        expect(core.info).toHaveBeenCalledWith('Reading comment body from file: path/to/file.txt');
        expect(fs.readFileSync).toHaveBeenCalledWith('path/to/file.txt', 'utf8');
    });

    it('throws error if both comment_body and comment_body_path are provided', () => {
        core.getInput.mockImplementation((key) => {
            if (key === 'comment_body') return 'Direct comment';
            if (key === 'comment_body_path') return 'path/to/file.txt';
            return '';
        });
        expect(() => getCommentBody()).toThrow("Both 'comment_body' and 'comment_body_path' inputs were provided. Please use only one.");
    });

    it('throws error if file cannot be read', () => {
        core.getInput.mockImplementation((key) => key === 'comment_body_path' ? 'bad/path.txt' : '');
        fs.readFileSync.mockImplementation(() => { throw new Error('File not found'); });
        expect(() => getCommentBody()).toThrow("Could not read file at path: bad/path.txt. Error: File not found");
    });

    it('throws error if neither comment_body nor comment_body_path is provided', () => {
        core.getInput.mockReturnValue('');
        expect(() => getCommentBody()).toThrow("Either a 'comment_body' or a 'comment_body_path' input must be supplied.");
    });
});