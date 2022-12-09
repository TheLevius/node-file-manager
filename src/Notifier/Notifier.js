export class Notifier {
	constructor(username, logger = console.log) {
		this.username = username;
		this.logger = logger;
	}

	greeting = () => this.logger(`Welcome to the File Manager, ${this.username}!`);
	farewell = () => this.logger(`\nThank you for using File Manager, ${this.username}, goodbye!`);
	pwd = (workingDirectory) => this.logger(`You are currently in ${workingDirectory ?? 'Unknown directory'}`);
	log = (text) => this.logger(text ?? 'empty');
}
