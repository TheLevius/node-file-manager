import {
	parse,
	join,
	sep,
	dirname,
	resolve,
	isAbsolute
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
	pipeline
} from 'node:stream/promises';
import {
	createBrotliCompress,
	createBrotliDecompress
} from 'node:zlib';
import {
	homedir
} from 'node:os';
import massPathResolve from '../utils/massPathResolve.js';
import massExistSyncCheck from '../utils/massExistSyncCheck.js';
export default class {
	constructor({ informer, hasher }) {
		this._root = parse(process.cwd()).root;
		this._cwd = homedir();
		this._informer = informer;
		this._hasher = hasher;
	}

	_argsControl = (args = [], minArgs = 0, cb) => {
		if (args.length >= minArgs) {
		return cb(args);
		}
		return console.log('incorrect format: ', ...args);
	}

	pwd = () => console.log(`You are currently in ${this._cwd}`)

	greeting = () => console.log(this._informer.greeting())
	farewell = () => console.log(this._informer.farewell())

	os(args) {
		
		if (args.length > 0) {
			return args.forEach((arg) => {
				const parsedArg = arg.replace(/^--/, '');
				if (typeof this._informer[parsedArg] === 'function') {
					console.log(this._informer[parsedArg]());
				} else {
					console.log('incorrect argument: ', arg);
				}
			});
		} else {
			console.log('Please provide an argument');
		}
	};

	up() {
		if (this._cwd !== this._root) {
			this._cwd = join(this._cwd, '..', sep);
		} else {
			console.log('Access Denied');
		}
		return this.pwd();
	}
	cd(args) {
		return this._argsControl(args, 1, ([inputPath])=> {
			this._cwd = isAbsolute(inputPath) ? inputPath : join(this._cwd, inputPath, sep);
			return this.pwd();
		})
	}

	async ls(args) {
		const currentPath = args[0] ?? this._cwd;
		const basenames = await readdir(currentPath, {
				withFileTypes: true
			})
			.catch((err) => console.error('Operation failed\n', err));

		try {
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
		} catch(err) {
			console.error('Operation failed\n', err);
		}
	}
	cat(args) {
		return this._argsControl(args, 1, async ([inputPath]) => {
			const currentPath = resolve(inputPath);
			try {
				const currentPathStat = await stat(currentPath);
				if (currentPathStat.isFile()) {
					const readStream = createReadStream(currentPath);
					readStream.on('data', (chunk) => {
						const data = chunk.toString();
						return console.log(data);
					});

				} else {
					console.error(`${inputPath} is a Directory`);
				}

			} catch (err) {
				console.error('Operation failed\n', err);
			}
		});
	}
	add(args) {
		return this._argsControl(args, 1, async ([inputPath]) => {
			const currentPath = resolve(inputPath);
			try {
				const emptyFile = await open(currentPath, 'wx');
				await emptyFile.close();
			} catch (err) {
				console.error('Operation failed\n', err);
			}
		});
	}
	rn(args) {
		return this._argsControl(args, 2, async ([inputOld, inputNew]) => {
			const oldPath = resolve(inputOld);
			const newPath = resolve(inputNew);
			if (existsSync(newPath)) {
				return console.error(`${newPath} is already exists!`);
			}
			await rename(oldPath, newPath)
				.catch((err) => console.error('Operation failed\n', err));
		});
	}
	rm(args) {
		return this._argsControl(args, 1, async (args) => {
			args.forEach((pathToRm) => {
				const pathToFile = resolve(pathToRm);
				remove(pathToFile)
					.catch((err) => console.error('Operation failed\n', err));
			})
		});
	}
	cp(args) {
		return this._argsControl(args, 2, async (args) => {
			const [src, destFolder] = massPathResolve(args.slice(0, 2));
			const {
				base
			} = parse(src);
			const destPath = join(destFolder, base);
			
			if (!existsSync(destFolder)) {
				await mkdir(destFolder, {
						recursive: true
					})
					.catch((err) => console.error('Operation failed\n', err));
			}
			if (existsSync(src)) {
				try {
					const readStream = createReadStream(src);
					const writeStream = createWriteStream(destPath, {
						flags: 'wx'
					});
					readStream.pipe(writeStream);
				} catch(err) {
					console.error('Operation failed\n', err);
				}
			} else {
				return console.error(`${src} is not exists`);
			}
		});
	}
	async mv(args) {
		try {
			await this.cp(args);
			await this.rm(args);
		} catch (err) {
			console.error('Operation failed\n', err);
		}
	}

	hash(args) {
		return this._argsControl(args, 1, async ([inputPath]) => {
			const pathToFile = resolve(inputPath);
			return this._hasher.hash(pathToFile);
		});	
	}

	async _createTransformStream(src, dest, ...transformers) {
		try {
			const readStream = createReadStream(src);
			const writeStream = createWriteStream(dest, {
				flags: 'wx'
			});
			await pipeline(readStream, ...transformers, writeStream);
		} catch(err) {
			console.error('Operation failed\n', err);
		}
	}
	_safeCreateTransformStream(args = [], ...transformers) {
		return this._argsControl(args, 2, async (args) => {
			try {
				const [src, dest] = massPathResolve(args.slice(0, 2));
				const results = massExistSyncCheck([src, dirname(dest)]);
				if (results.status === 'OK') {
					return this._createTransformStream(src, dest, ...transformers);
				} else {
					return results.notExistIndexList.forEach((i) => {
						console.error(`${results.checkedPaths[i].path} is not exists`);
					});
			}
			} catch(err) {
				console.error('Operation failed\n', err);
			}
		});
	}
	compress(args) {
		return this._safeCreateTransformStream(args, createBrotliCompress());
	}
	decompress(args) {
		return this._safeCreateTransformStream(args, createBrotliDecompress());
	}
}
