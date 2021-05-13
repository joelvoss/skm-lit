import * as fs from 'fs';
import { URL } from 'url';
import * as tmp from 'tmp';
import * as path from 'path';
import { execSync } from 'child_process';
import * as mkdirp from 'mkdirp';
import { readPackageUpSync } from 'readpkg-lit';

/**
 * Load environment variables from a .env file. dotenv will never modify any
 * environment variables that have already been set. Variable expansion is
 * supported in .env files.
 * @see https://github.com/motdotla/dotenv
 * @see https://github.com/motdotla/dotenv-expand
 */
if (fs.existsSync('.env')) {
	require('dotenv').config({
		path: '.env',
	});
}

// Get the current package.json path relative to the caller
const rpu = readPackageUpSync({
	cwd: fs.realpathSync(process.cwd()),
});

/**
 * fromPkgRoot resolve path relative to callers application root.
 * @param  {string[]} paths - paths to join
 * @return {string}
 */
const fromPkgRoot = (...paths: string[]) =>
	path.join(path.dirname(rpu!.path), ...paths);

const prefixRegexp = new RegExp('^skm-lit://', 'i');
const leadingSlashRegexp = new RegExp('^/');
let unused = true;

// Set sensible defaults for all relevant environment variables.
process.env = Object.keys(process.env).reduce(
	(env: { [key: string]: string }, key) => {
		let value = process.env[key]!;

		if (value.match(prefixRegexp)) {
			unused = false;
			const ref = resolveReference(value);
			try {
				// We deliberately block the main thread in order to fetch the
				// secret data from Cloud Storage synchronously.
				const plaintext = execSync(
					`node -e '${fetchDataFromStorageCmd(ref.bucket, ref.object)}'`,
					{ stdio: 'pipe' },
				);

				if (ref.filepath) {
					fs.writeFileSync(ref.filepath, plaintext, 'utf8');
					env[key] = ref.filepath;
					return env;
				}

				env[key] = plaintext.toString();
				return env;
			} catch (err) {
				console.error(`[ ERR ] ${key}: ${err.stderr.toString()}`);
				return env;
			}
		}

		env[key] = value;
		return env;
	},
	{},
);

// Warn about unused key-manager
if (unused) {
	console.warn(
		`[ WARN ] skm-lit was included, but no secrets were found in the environment`,
	);
}

/**
 * resolveReference resolves a given skm-lit reference into bucket, object
 * and an optional filepath values.
 */
export function resolveReference(ref: string): {
	bucket: string;
	object: string;
	filepath?: string;
} {
	// Parse the URL to extract any query params
	const u = new URL(ref);

	const bucket = u.hostname;
	// Remove any leading slashes
	const object = u.pathname.replace(leadingSlashRegexp, '');
	if (!object) {
		throw new Error(`invalid secret format ${ref}`);
	}

	// Parse out destination
	// `filepath` will be undefined if no destination paramter was set
	const dest = u.searchParams.get('destination');
	let filepath;
	switch (dest) {
		case 'tmpfile':
		case 'tempfile': {
			const f = tmp.fileSync({ prefix: 'skm-lit-' });
			filepath = f.name;
			break;
		}
		default: {
			// Guard against dest = undefined
			if (dest) {
				const p = path.isAbsolute(dest)
					? dest.split('/')
					: fromPkgRoot(dest).split('/');
				const base = p.slice(0, -1).join('/');
				const file = p.slice(-1);
				mkdirp.sync(base);
				filepath = `${base}/${file}`;
				break;
			}
		}
	}
	return {
		bucket,
		object,
		// Append filepath if available
		...(filepath ? { filepath } : {}),
	};
}

/**
 * fetchDataFromStorageCmd returns a node command to fetch a file from
 * a storage bucket. All strings have to be wrapped in ".
 */
export function fetchDataFromStorageCmd(bucket: string, file: string) {
	return `
const { Storage } = require("@google-cloud/storage");
const storage = new Storage();
storage
  .bucket("${bucket}")
  .file("${file}")
  .download()
  .then(plaintext => console.log(plaintext.toString()))
  .catch(err => {
    console.error(err.message);
    process.exitCode = 1;
  });
`.trim();
}
