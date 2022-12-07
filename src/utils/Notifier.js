export class UserNotifier {
	constructor(username) {
		this.username = username
	}
	greeting = () => {
		console.log(`Welcome to the File Manager, ${this.username}!\n`);
	}
	farewell = () => {
		console.log(`\nThank you for using File Manager, ${this.username}, goodbye!\n`);
	}
	pwd = (currentPath = 'unknown path') => {
		console.log(`You are currently in ${currentPath}`);
	}
}
