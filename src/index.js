// import {
// 	defineAbsPath
// } from './utils/defineAbsolutePath.js';
import defineUser from './utils/defineUser.js';
import {
	Notifier
} from './Notifier/Notifier.js';
import {
	homedir
} from 'node:os';
// const getPath = defineAbsPath(
// 	import.meta.url);
import FileManager from './fileManager/FileManager.js';

const args = process.argv.slice(2);
const parsedArgsCollection = args.reduce((acc, el) => {
	if (el.includes('--', 0) && el.length > 2) {
		const [key, value] = el.split('=');
		const parsedKey = key.replace(/^--/, '');
		acc[parsedKey] = value;
	}
	return acc;
}, {});

const setHandler = (executor) => {
	return (commandLine) => {
		const [cmd, ...data] = commandLine.toString().trim().split(' ');
		if (cmd === 'CLOSE') {
			return process.exit();
		}
		if (typeof executor[cmd] === 'function') {
			return executor[cmd](data);
		}
		return executor.log('Command not Found');
	};
};

const currentUser = defineUser(parsedArgsCollection.username);
const notifier = new Notifier(currentUser);
const fileManager = new FileManager(homedir(), process.cwd(), notifier);
const fileManagerHandler = setHandler(fileManager);

fileManager.greeting();
fileManager.pwd();

process.stdin.on('data', fileManagerHandler);
process.on('exit', fileManager.farewell);
process.on('SIGINT', process.exit);
