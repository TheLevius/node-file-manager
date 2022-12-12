import {
	parse,
	join,
	sep,
	dirname,
	resolve
} from 'node:path';
import {
	open,
	readdir,
	readFile,
	rename,
	stat,
	rm as remove,
	mkdir
} from 'node:fs/promises';
import {
	createReadStream,
	createWriteStream,
	existsSync
} from 'node:fs';
import {
	cpus,
	arch,
	EOL
} from 'node:os';
import {
	createHash
} from 'node:crypto';
import {
	pipeline
} from 'node:stream/promises';
import {
	createBrotliCompress,
	createBrotliDecompress
} from 'node:zlib';
export default class {
	constructor(homedir, workDir, currentUser) {
		const parsedHomeDir = parse(homedir);
		const parsedWorkDir = parse(workDir);

		this._currentUser = currentUser;
		this._homedir = homedir;
		this._root = parsedHomeDir.root;
		this._username = parsedHomeDir.base;
		this._current = workDir;
		this._parsedHome = parsedHomeDir;
		this._parsedWork = parsedWorkDir;
		this._commands = {
			'--EOL': () => JSON.stringify(EOL),
			'--homedir': () => this._homedir,
			'--username': () => this._currentUser ?? this._username,
			'--architecture': () => arch(),
			'--cpus': () => cpus()[0].model,
		};
	}
	get wd() {
		return this._current;
	}

	set wd(value) {
		this._current = value;
	}

	_massPathResolve = (paths) => paths.map((p) => resolve(p));

	_massExistSyncChecker(paths) {
		const indexOfNotExistingPath = paths.findIndex((el) => !existsSync(el));

		if (indexOfNotExistingPath === -1) {
			return ({
				status: 'OK'
			});
		} else {
			return ({
				status: 'ERROR',
				failedPath: paths[indexOfNotExistingPath],
				failedIndex: indexOfNotExistingPath
			});
		}
	}

	greeting = () => console.log(`Welcome to the File Manager, ${this._currentUser}!`)
	farewell = () => console.log(`\nThank you for using File Manager, ${this._currentUser}, goodbye!`)
	pwd = () => console.log(`You are currently in ${this.wd ?? 'Unknown directory'}`)

	os(args) {
		if (args.length) {
			return args.forEach((arg) => {
				if (typeof this._commands[arg] === 'function') {
					console.log(this._commands[arg]());
				} else {
					console.log('incorrect argument: ', arg);
				}
			});
		} else {
			console.log('Please provide an argument');
		}
	}

	up() {
		if (this._current !== this._root) {
			this.wd = join(this._current, '..', sep);
			return this.pwd();
		} else {
			return console.log('Access Denied');
		}
	}
	cd(args) {
		if (args.length === 1) {
			this.wd = resolve(args[0]);
			return this.pwd;
		} else {
			return console.log('incorrect format: ', ...args);
		}
	}

	async ls(args) {
		const currentPath = args[0] ?? this._current;
		const basenames = await readdir(currentPath, {
				withFileTypes: true
			})
			.catch((err) => console.error(err));

		const results = basenames
			.map((basename) => ({
				Name: basename.name,
				Type: basename.isDirectory() ? 'directory' : 'file'
			}))
			.sort((a, b) => {
				if (a.Type > b.Type) return 1;
				if (a.Type < b.Type) return -1;
				if (a.Name.toUpperCase() < b.Name.toUpperCase()) return -1;
				if (a.Name.toUpperCase() > b.Name.toUpperCase()) return 1;
				return 0;
			});
		console.table(results);
	}
	async cat(args) {
		if (args.length === 1) {
			const currentPath = resolve(args[0]);
			try {
				const currentPathStat = await stat(currentPath);
				if (currentPathStat.isFile()) {
					const readStream = createReadStream(currentPath);
					readStream.on('data', (chunk) => {
						const data = chunk.toString();
						return console.log(data);
					});

				} else {
					console.error(`${args[0]} is a Directory`);
				}

			} catch (err) {
				console.error(arr);
			}
		} else {
			console.log('path not found');
		}
	}
	async add(args) {
		if (args.length === 1) {
			const currentPath = resolve(args[0]);
			try {
				const emptyFile = await open(currentPath, 'wx');
				await emptyFile.close();
			} catch (err) {
				console.error(err);
			}
		}
	}
	async rn(args) {
		if (args.length === 2) {
			const oldPath = resolve(args[0]);
			const newPath = resolve(args[1]);
			if (existsSync(newPath)) {
				return console.error(`${newPath} is already exists!`);
			}
			await rename(oldPath, newPath)
				.catch((err) => console.error(err));
		} else {
			console.log('incorrect format: ', ...args);
		}
	}
	async rm(args) {
		if (args.length) {
			args.forEach((pathToRm) => {
				const pathToFile = resolve(pathToRm);
				remove(pathToFile)
					.catch((err) => console.error(err));
			})
		} else {
			console.log('incorrect format: ', ...args);
		}
	}
	async cp(args) {
		if (args.length >= 2) {
			const [src, destFolder] = args;
			const {
				base
			} = parse(src);
			const srcPath = resolve(src);
			const destFolderPath = resolve(destFolder);
			const destPath = join(destFolderPath, base);
			if (!existsSync(destFolderPath)) {
				await mkdir(destFolderPath, {
						recursive: true
					})
					.catch(console.error);
			}
			const readStream = createReadStream(srcPath);
			const writeStream = createWriteStream(destPath, {
				flags: 'wx'
			});
			readStream.pipe(writeStream);
		} else {
			console.log('incorrect format: ', ...args);
		}
	}
	async mv(args) {
		try {
			await this.cp(args);
			await this.rm(args);
		} catch (err) {
			console.error(err);
		}
	}

	async hash(args) {
		if (args.length) {
			const pathToFile = resolve(args[0]);
			try {
				const data = await readFile(pathToFile, {
					encoding: 'utf8'
				});
				const hashSum = createHash('sha256');
				hashSum.update(data);
				const hex = hashSum.digest('hex');
				console.log(hex);
			} catch (err) {
				console.error(err);
			}

		} else {
			console.log('incorrect format: ', ...args);
		}
	}

	async _createTransformStream(src, dest, ...transformers) {
		const readStream = createReadStream(src);
		const writeStream = createWriteStream(dest, {
			flags: 'wx'
		});
		await pipeline(readStream, ...transformers, writeStream)
			.catch((err) => console.error(err));
	}
	_safeCreateTransformStream(transformer, args = []) {
		if (args.length >= 2) {
			const [src, dest] = this._massPathResolve(args.slice(0, 2));
			const res = this._massExistSyncChecker([src, dirname(dest)]);
			if (res.status === 'OK') {
				return this._createTransformStream(src, dest, transformer);

			} else {
				return console.error(`${res.failedPath} is not exists`);
			}

		} else {
			console.log('incorrect format: ', ...args);
		}
	}
	compress(args) {
		return this._safeCreateTransformStream(createBrotliCompress(), args);
	}
	decompress(args) {
		return this._safeCreateTransformStream(createBrotliDecompress(), args);
	}
}
