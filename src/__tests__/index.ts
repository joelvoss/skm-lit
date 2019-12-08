import {
  resolveReference,
  parseQuery,
  fetchDataFromStorageCmd,
} from '../index';

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

jest.mock('read-pkg-up', () => ({
  sync: () => ({
    path: '/Users/testuser/test-path',
  }),
}));

test(`resolveReference should resolve a skm-lit reference string`, () => {
  const ref1 = `skm-lit://my-bucket/path/to/my-secret`;
  const ref2 = `skm-lit://my-bucket/path/to/my-secret?destination=tempfile`;
  const ref3 = `skm-lit://my-bucket/path/to/my-secret?destination=path/to/file`;
  const ref4 = `skm-lit://my-bucket/path/to/my-secret?destination=/path/to/file`;

  const baseExpect = {
    bucket: 'my-bucket',
    object: 'path/to/my-secret',
  };

  expect(resolveReference(ref1)).toEqual(baseExpect);
  expect(resolveReference(ref2)).toEqual({
    ...baseExpect,
    filepath: 'skm-lit-test-path',
  });
  expect(resolveReference(ref3)).toEqual({
    ...baseExpect,
    filepath: '/Users/testuser/test-path/path/to/file',
  });
  expect(resolveReference(ref4)).toEqual({
    ...baseExpect,
    filepath: '/path/to/file',
  });
});

test(`parseQuery should parse a url query string into an object`, () => {
  expect(parseQuery(`first=parameter&second=parameter`)).toEqual({
    first: 'parameter',
    second: 'parameter',
  });
});

test(`fetchDataFromStorageCmd returns the correct command string`, () => {
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
