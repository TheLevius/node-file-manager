// import {
// 	defineAbsPath
// } from './utils/defineAbsolutePath.js';
import defineUser from './utils/defineUser.js';
import {
	homedir
} from 'node:os';
// const getPath = defineAbsPath(
// 	import.meta.url);
import FileManager from './components/fileManager/FileManager.js';
import Handler from './components/Handler/Handler.js';

const args = process.argv.slice(2);
console.log(args);
const parsedArgsCollection = args.reduce((acc, el) => {
	if (el.includes('--', 0) && el.length > 2) {
		const [key, value] = el.split('=');
		const parsedKey = key.replace(/^--/, '');
		acc[parsedKey] = value;
	}
	return acc;
}, {});

const currentUser = defineUser(parsedArgsCollection.username);
const fileManager = new FileManager(homedir(), process.cwd(), currentUser);
const handler = new Handler(fileManager);

fileManager.greeting();
fileManager.pwd();

process.stdin.on('data', handler.inputReader);
process.on('exit', fileManager.farewell);
process.on('SIGINT', process.exit);
