import FileManager from './components/FileManager.js';
import Handler from './components/Handler.js';
import Informer from './components/Informer.js';

const args = process.argv.slice(2);
const parsedArgsCollection = args.reduce((acc, el) => {
	if (el.length > 2 && el.includes('--', 0)) {
		const [key, value] = el.split('=');
		const parsedKey = key.replace(/^--/, '');
		acc[parsedKey] = value;
	}
	return acc;
}, {});

const informer = new Informer({username: parsedArgsCollection.username});
const fileManager = new FileManager({informer});
const handler = new Handler({executor: fileManager});

fileManager.greeting();
fileManager.pwd();

process.stdin.on('data', handler.inputReader);
process.on('exit', fileManager.farewell);
process.on('SIGINT', process.exit);
