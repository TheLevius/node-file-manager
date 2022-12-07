import {
	defineAbsPath
} from './utils/defineAbsolutePath.js';
import defineUser from './utils/defineUser.js';
import {
	UserNotifier
} from './utils/Notifier.js';
import {
	homedir
} from 'node:os';
const getPath = defineAbsPath(
	import.meta.url);

const args = process.argv.slice(2);
const parsedArgsCollection = args.reduce((acc, el) => {
	if (el.includes('--', 0) && el.length > 2) {
		const entry = el.split('=');
		entry[0] = entry[0].replace(/^--/, '');
		acc[entry[0]] = entry[1];
	}
	return acc;
}, {});

const currentUser = defineUser(parsedArgsCollection.username);
const messenger = new UserNotifier(currentUser);

messenger.greeting();

messenger.pwd(homedir());

process.on('exit', messenger.farewell);
process.on('SIGINT', process.exit);
