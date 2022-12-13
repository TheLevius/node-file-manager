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
// import {
// 	cpus,
// 	arch,
// 	EOL,
// 	homedir,
// 	userInfo
// } from 'node:os';
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
	constructor({ informer }) {
		this._root = parse(process.cwd()).root;
		this._cwd = process.cwd();
		this._informer = informer;
	}

	_massPathResolve = (paths) => paths.map((p) => resolve(p));

	_massExistSyncCheck = (paths) => {
		const results = paths.reduce((acc, path, index) => {			
			const isExist = existsSync(path);
			if (!isExist) {
				acc.notExistIndexList.push(index);
			}
			acc.checkedPaths.push({ path, index, isExist });
			return acc;
		}, { notExistIndexList: [], checkedPaths: [] });

		results.status = results.notExistIndexList.length === 0 ? 'OK' : 'FAILED';
		return results;
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
		if (args.length === 1) {
			const inputPath = args[0];
			this._cwd = isAbsolute(inputPath) ? inputPath : join(this._cwd, inputPath, sep);
			return this.pwd();
		} else {
			return console.log('incorrect format: ', ...args);
		}
	}

	async ls(args) {
		const currentPath = args[0] ?? this._cwd;
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
			const [src, destFolder] = this._massPathResolve(args.slice(0, 2));
			const {
				base
			} = parse(src);
			const destPath = join(destFolder, base);
			
			if (!existsSync(destFolder)) {
				await mkdir(destFolder, {
						recursive: true
					})
					.catch(console.error);
			}
			if (existsSync(src)) {
				try {
					const readStream = createReadStream(src);
					const writeStream = createWriteStream(destPath, {
						flags: 'wx'
					});
					readStream.pipe(writeStream);
				} catch(err) {
					console.error(err);
				}
			} else {
				return console.error(`${src} is not exists`);
			}
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
	_safeCreateTransformStream(args = [], ...transformers) {
		if (args.length >= 2) {
			const [src, dest] = this._massPathResolve(args.slice(0, 2));
			const results = this._massExistSyncCheck([src, dirname(dest)]);
			if (results.status === 'OK') {
				return this._createTransformStream(src, dest, ...transformers);
			} else {
				return results.notExistIndexList.forEach((i) => {
					console.error(`${results.checkedPaths[i].path} is not exists`);
				});
			}

		} else {
			console.log('incorrect format: ', ...args);
		}
	}
	compress(args) {
		return this._safeCreateTransformStream(args, createBrotliCompress());
	}
	decompress(args) {
		return this._safeCreateTransformStream(args, createBrotliDecompress());
	}
}
