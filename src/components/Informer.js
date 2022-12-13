import { EOL, arch, cpus, homedir, userInfo } from 'node:os';
export default class {
	constructor({ username }) {
		this._username = username ?? userInfo().username;
	}

	EOL = () => JSON.stringify(EOL);
	homedir	= () => homedir();
	architecture = () => arch();
	username = () => this._username;
	cpus = () => {
		const cpusInfo = cpus();
		return (`CPU: Model: ${cpusInfo[0].model}, Logical cores: ${cpusInfo.length}`);
	}
	greeting = () => `Welcome to the File Manager, ${this._username}!`;
	farewell = () => `\nThank you for using File Manager, ${this._username}, goodbye!`;
	
};
