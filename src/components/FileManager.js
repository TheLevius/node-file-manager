import {
	parse,
	join,
	sep,
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
	cpus,
	arch,
	EOL
} from 'node:os';
import {
	createHash
} from 'node:crypto';
import {
	pipeline
} from 'node:stream';
import {
	createBrotliCompress,
	createBrotliDecompress
} from 'node:zlib';
import {
	promisify
} from 'node:util';
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
	}
	get wd() {
		return this._current;
	}

	set wd(value) {
		this._current = value;
	}

	greeting = () => console.log(`Welcome to the File Manager, ${this._currentUser}!`)
	farewell = () => console.log(`\nThank you for using File Manager, ${this._currentUser}, goodbye!`)
	pwd = () => console.log(`You are currently in ${this.wd ?? 'Unknown directory'}`)

	os(args) {
		const commands = {
			'--EOL': () => JSON.stringify(EOL),
			'--homedir': () => this._homedir,
			'--username': () => this._currentUser ?? this._username,
			'--architecture': () => arch(),
			'--cpus': () => cpus()[0].model,
		};
		args.forEach((arg) => {
			if (typeof commands[arg] === 'function') {
				console.log(commands[arg]());
			} else {
				console.log('incorrect argument: ', arg);
			}
		});
	}

	_pathResolver = (inputPath) => isAbsolute(inputPath) ? inputPath : join(this._current, inputPath)

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
			this.wd = this._pathResolver(args[0]);
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
			const currentPath = this._pathResolver(args[0]);
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
			const currentPath = this._pathResolver(args[0]);
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
			const oldPath = this._pathResolver(args[0]);
			const newPath = this._pathResolver(args[1]);
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
				const pathToFile = this._pathResolver(pathToRm);
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
			const srcPath = this._pathResolver(src);
			const destFolderPath = this._pathResolver(destFolder);
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
			const pathToFile = this._pathResolver(args[0]);
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
	async _createTransformStream(args) {
		if (args.length >= 3) {
			const [src, dest, ...transformers] = args;
			const srcPath = this._pathResolver(src);
			const destPath = this._pathResolver(dest);
			const readStream = createReadStream(srcPath);
			const writeStream = createWriteStream(destPath);

			const pipe = promisify(pipeline);

			return pipe(readStream, ...transformers, writeStream);
		} else {
			console.log('incorrect format: ', ...args);
		}
	}
	async compress(args) {
		if (args.length >= 2) {
			await this._createTransformStream([args[0], args[1], createBrotliCompress()]);
		} else {
			console.log('incorrect format: ', ...args);
		}
	}
	async decompress(args) {
		if (args.length >= 2) {
			await this._createTransformStream([args[0], args[1], createBrotliDecompress()]);
		} else {
			console.log('incorrect format: ', ...args);
		}
	}
}
