const { getCommentBody } = require('../../src/util/util');
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

    it('returns direct comment when only comment-body is provided', () => {
        core.getInput.mockImplementation((key) => key === 'comment-body' ? 'Direct comment' : '');
        expect(getCommentBody()).toBe('Direct comment');
    });

    it('reads comment body from file when only comment-body-path is provided', () => {
        core.getInput.mockImplementation((key) => key === 'comment-body-path' ? 'path/to/file.md' : '');
        fs.readFileSync.mockReturnValue('File comment');
        expect(getCommentBody()).toBe('File comment');
        expect(core.info).toHaveBeenCalledWith('Reading comment body from file: path/to/file.md');
        expect(fs.readFileSync).toHaveBeenCalledWith('path/to/file.md', 'utf8');
    });

    it('throws error if both comment-body and comment-body-path are provided', () => {
        core.getInput.mockImplementation((key) => {
            if (key === 'comment-body') return 'Direct comment';
            if (key === 'comment-body-path') return 'path/to/file.md';
            return '';
        });
        expect(() => getCommentBody()).toThrow("Both 'comment-body' and 'comment-body-path' inputs were provided. Please use only one.");
    });

    it('throws error if file cannot be read', () => {
        core.getInput.mockImplementation((key) => key === 'comment-body-path' ? 'bad/path.md' : '');
        fs.readFileSync.mockImplementation(() => { throw new Error('File not found'); });
        expect(() => getCommentBody()).toThrow("Could not read file at path: bad/path.md. Error: File not found");
    });

    it('throws error if neither comment-body nor comment-body-path is provided', () => {
        core.getInput.mockReturnValue('');
        expect(() => getCommentBody()).toThrow("Either a 'comment-body' or a 'comment-body-path' input must be supplied.");
    });


    it('removes BOM from file content if present', () => {
        core.getInput.mockImplementation((key) => key === 'comment-body-path' ? 'bomfile.md' : '');
        // 0xFEFF is BOM, followed by 'File comment'
        const bomContent = '\uFEFFFile comment';
        fs.readFileSync.mockReturnValue(bomContent);
        expect(getCommentBody()).toBe('File comment');
        expect(core.info).toHaveBeenCalledWith('Reading comment body from file: bomfile.md');
        expect(fs.readFileSync).toHaveBeenCalledWith('bomfile.md', 'utf8');
    });

    it('returns empty string when file is empty', () => {
        core.getInput.mockImplementation((key) => key === 'comment-body-path' ? 'emptyfile.md' : '');
        fs.readFileSync.mockReturnValue('');
        expect(getCommentBody()).toBe('');
        expect(core.info).toHaveBeenCalledWith('Reading comment body from file: emptyfile.md');
        expect(fs.readFileSync).toHaveBeenCalledWith('emptyfile.md', 'utf8');
    });

    it('throws error if file content is not a string', () => {
        core.getInput.mockImplementation((key) => key === 'comment-body-path' ? 'notstring.md' : '');
        fs.readFileSync.mockReturnValue(Buffer.from('not a string'));
        expect(() => getCommentBody()).toThrow();
    });

    it('throws error if comment-body-path does not end with .md', () => {
        core.getInput.mockImplementation((key) => key === 'comment-body-path' ? 'file.txt' : '');
        expect(() => getCommentBody()).toThrow("The 'comment-body-path' must point to a markdown (.md) file.");
    });

    it('handles file content with new lines correctly', () => {
        core.getInput.mockImplementation((key) => key === 'comment-body-path' ? 'multiline.md' : '');
        const multilineContent = 'Line 1\nLine 2\nLine 3';
        fs.readFileSync.mockReturnValue(multilineContent);
        expect(getCommentBody()).toBe(multilineContent);
        expect(core.info).toHaveBeenCalledWith('Reading comment body from file: multiline.md');
        expect(fs.readFileSync).toHaveBeenCalledWith('multiline.md', 'utf8');
    });

    it('returns direct comment even if it contains new lines', () => {
        core.getInput.mockImplementation((key) => key === 'comment-body' ? 'Line 1\nLine 2' : '');
        expect(getCommentBody()).toBe('Line 1\nLine 2');
    });
});