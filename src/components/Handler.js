export default class {
	constructor(executor) {
		this._executor = executor;
	}
	inputReader = (commandLine) => {
		const [cmd, ...data] = commandLine.toString().trim().split(' ');
		if (cmd === 'CLOSE') {
			return process.exit();
		}
		if (typeof this._executor[cmd] === 'function') {
			return this._executor[cmd](data);
		}
		return console.log('Command not Found');
	}
}
