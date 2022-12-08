import path, {
	parse,
	join
} from 'node:path';
import {
	open,
	readdir,
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

export default class {
	constructor(homedir, workDir, notifier) {
		const parsedHomeDir = parse(homedir);
		const parsedWorkDir = parse(workDir);

		this._homedir = homedir;
		this._root = parsedHomeDir.root;
		this._username = parsedHomeDir.base;
		this._current = workDir;
		this._parsedHome = parsedHomeDir;
		this._parsedWork = parsedWorkDir;
		this.notifier = notifier;
	}
	get wd() {
		return this._current;
	}

	set wd(value) {
		this._current = value;
	}
	pwd = () => this.notifier.pwd(this.wd);
	greeting = () => this.notifier.greeting();
	farewell = () => this.notifier.farewell();
	log = (text) => this.notifier.log(text);

	async ls(args) {
		try {
			const currentPath = args[0] ?? this._current;
			const basenames = await readdir(currentPath);
			const statResults = await Promise.allSettled(basenames.map((basename) => {
				const joinedPath = join(currentPath, basename);
				return new Promise(async (res, rej) => {
					try {
						const stats = await stat(joinedPath);
						res({
							Name: basename,
							Type: stats.isDirectory() ? 'directory' : 'file'
						});
					} catch (err) {
						rej(err);
					}
				});
			}));
			const results = statResults
				.reduce((acc, pathResult) => {
					if (pathResult.status === 'fulfilled') {
						acc.push(pathResult.value);
					}
					return acc;
				}, [])
				.sort((a, b) => {
					if (a.Type > b.Type) return 1;
					if (a.Type < b.Type) return -1;
					if (a.Name < b.Name) return 1;
					if (a.Name > b.Name) return -1;
					return 0;
				});
			console.table(results);
		} catch (err) {
			if (err.code === 'ENOENT') {
				throw new Error('FS operation failed');
			}
			console.error(err);
		}
	}
	async cat(args) {
		if (args.length === 1) {
			const currentPath = join(this._current, args[0]);
			try {
				const currentPathStat = await stat(currentPath);
				if (currentPathStat.isFile()) {
					const readStream = createReadStream(currentPath);
					readStream.on('data', (chunk) => {
						const data = chunk.toString();
						return console.log(data);
					});
				} else {
					return console.error(`${args[0]} is a Directory`);
				}
			} catch (err) {
				return console.error(arr);
			}
		} else {
			return this.notifier.log('path not found');
		}
	}
	async add(args) {
		if (args.length === 1) {
			const currentPath = join(this._current, args[0]);
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
			const [srcBasename, destBasename] = args;
			const oldPath = join(this._current, srcBasename);
			const newPath = join(this._current, destBasename);
			if (existsSync(newPath)) {
				return this.notifier.log(`${destBasename} is already exists!`);
			}
			try {
				await rename(oldPath, newPath);
			} catch (err) {
				console.error(err);
			}
		} else {
			return this.notifier.log('incorrect format: ', ...args);
		}
	}
	async rm(args) {
		if (args.length) {
			const pathToFile = join(this._current, args[0]);
			await remove(pathToFile);
		} else {
			return this.notifier.log('incorrect format: ', ...args);
		}
	}
	async cp(args) {
		if (args.length === 2) {
			const [src, destFolder] = args;
			const {
				base
			} = parse(src);
			const srcPath = join(this._current, src);
			const destFolderPath = join(this._current, destFolder);
			const destPath = join(destFolderPath, base);
			if (!existsSync(destFolderPath)) {
				await mkdir(destFolderPath, {
						recursive: true
					})
					.catch(console.error);
			}
			const readStream = createReadStream(srcPath);
			const writeStream = createWriteStream(destPath);
			readStream.pipe(writeStream);
		} else {
			return this.notifier.log('incorrect format: ', ...args);
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
}
