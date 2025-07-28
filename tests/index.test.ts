import { describe, expect, test, vi } from 'vitest';
import { fetchDataFromStorageCmd, resolveReference } from '../src/index';

vi.mock('tmp', () => ({
	fileSync: ({ prefix }: { prefix: string }) => {
		return {
			name: `${prefix}test-path`,
		};
	},
}));

vi.mock('path', async () => {
	const path = await vi.importActual('path');
	return {
		join: (a: string, b: string) => `${a}/${b}`,
		dirname: (dir: string) => dir,
		isAbsolute: path.isAbsolute,
	};
});

vi.mock('mkdirp');

vi.mock('readpkg-lit', () => ({
	readPackageUpSync: () => ({
		path: '/Users/testuser/test-path',
	}),
}));

////////////////////////////////////////////////////////////////////////////////

describe(`resolveReference`, () => {
	const baseExpect = {
		bucket: 'my-bucket',
		object: 'path/to/my-secret',
	};

	test(`should resolve a reference string`, () => {
		const ref = `skm-lit://my-bucket/path/to/my-secret`;
		expect(resolveReference(ref)).toEqual(baseExpect);
	});

	test(`should resolve a reference string (dest = tempfile)`, () => {
		const ref = `skm-lit://my-bucket/path/to/my-secret?destination=tempfile`;
		expect(resolveReference(ref)).toEqual({
			...baseExpect,
			filepath: 'skm-lit-test-path',
		});
	});

	test(`should resolve a reference string (dest = relative path)`, () => {
		const ref = `skm-lit://my-bucket/path/to/my-secret?destination=path/to/file`;
		expect(resolveReference(ref)).toEqual({
			...baseExpect,
			filepath: '/Users/testuser/test-path/path/to/file',
		});
	});

	test(`should resolve a reference string (dest = absolute path)`, () => {
		const ref = `skm-lit://my-bucket/path/to/my-secret?destination=/path/to/file`;
		expect(resolveReference(ref)).toEqual({
			...baseExpect,
			filepath: '/path/to/file',
		});
	});
});

////////////////////////////////////////////////////////////////////////////////

describe(`fetchDataFromStorageCmd`, () => {
	test(`returns the correct command string`, () => {
		const cmd = `
const { Storage } = require("@google-cloud/storage");
const storage = new Storage();
storage
  .bucket("test-bucket")
  .file("test-file")
  .download()
  .then(plaintext => console.log(plaintext.toString()))
  .catch(err => {
    console.error(err.message);
    process.exitCode = 1;
  });`.trim();

		expect(fetchDataFromStorageCmd('test-bucket', 'test-file')).toBe(cmd);
	});
});
