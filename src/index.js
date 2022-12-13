import FileManager from './components/FileManager.js';
import Handler from './components/Handler.js';

const args = process.argv.slice(2);
const parsedArgsCollection = args.reduce((acc, el) => {
	if (el.length > 2 && el.includes('--', 0)) {
		const [key, value] = el.split('=');
		const parsedKey = key.replace(/^--/, '');
		acc[parsedKey] = value;
	}
	return acc;
}, {});

const fileManager = new FileManager(parsedArgsCollection.username);
const handler = new Handler(fileManager);

fileManager.greeting();
fileManager.pwd();

process.stdin.on('data', handler.inputReader);
process.on('exit', fileManager.farewell);
process.on('SIGINT', process.exit);
