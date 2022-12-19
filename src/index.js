import Hasher from './components/Hasher.js';
import Informer from './components/Informer.js';
import FileManager from './components/FileManager.js';
import Handler from './components/Handler.js';
import parseArgs from './utils/parseArgs.js';


const parsedArgsCollection = parseArgs(process.argv.slice(2));

const hasher = new Hasher();
const informer = new Informer({username: parsedArgsCollection.username});
const fileManager = new FileManager({informer, hasher});
const handler = new Handler({executor: fileManager});

fileManager.greeting();
fileManager.pwd();

process.stdin.on('data', handler.inputReader);
process.on('exit', fileManager.farewell);
process.on('SIGINT', process.exit);
