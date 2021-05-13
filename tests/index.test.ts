jest.mock('tmp', () => ({
	fileSync: ({ prefix }: { prefix: string }) => {
		return {
			name: `${prefix}test-path`,
		};
	},
}));

jest.mock('path', () => ({
	join: (a: string, b: string) => a + '/' + b,
	dirname: (dir: string) => dir,
	isAbsolute: jest.requireActual('path').isAbsolute,
}));

jest.mock('mkdirp');

jest.mock('readpkg-lit', () => ({
	readPackageUpSync: () => ({
		path: '/Users/testuser/test-path',
	}),
}));

////////////////////////////////////////////////////////////////////////////////

describe(`resolveReference`, () => {
	const { resolveReference} = require('../src/index');

	const baseExpect = {
		bucket: 'my-bucket',
		object: 'path/to/my-secret',
	};

	it(`should resolve a reference string`, () => {
		const ref = `skm-lit://my-bucket/path/to/my-secret`;
		expect(resolveReference(ref)).toEqual(baseExpect);
	});

	it(`should resolve a reference string (dest = tempfile)`, () => {
		const ref = `skm-lit://my-bucket/path/to/my-secret?destination=tempfile`;
		expect(resolveReference(ref)).toEqual({
			...baseExpect,
			filepath: 'skm-lit-test-path',
		});
	});

	it(`should resolve a reference string (dest = relative path)`, () => {
		const ref = `skm-lit://my-bucket/path/to/my-secret?destination=path/to/file`;
		expect(resolveReference(ref)).toEqual({
			...baseExpect,
			filepath: '/Users/testuser/test-path/path/to/file',
		});
	});

	it(`should resolve a reference string (dest = absolute path)`, () => {
		const ref = `skm-lit://my-bucket/path/to/my-secret?destination=/path/to/file`;
		expect(resolveReference(ref)).toEqual({
			...baseExpect,
			filepath: '/path/to/file',
		});
	});
});

////////////////////////////////////////////////////////////////////////////////

describe(`fetchDataFromStorageCmd`, () => {
	const { fetchDataFromStorageCmd} = require('../src/index');

	it(`returns the correct command string`, () => {
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
