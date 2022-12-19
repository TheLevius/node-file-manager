import { readFile } from 'node:fs/promises';
import {
	createHash
} from 'node:crypto';

export default class {
	constructor() {}
	async hash(pathToFile) {
		try {
			const data = await readFile(pathToFile, {
				encoding: 'utf8'
			});
			const hashSum = createHash('sha256').update(data);
			const hex = hashSum.digest('hex');
			console.log(hex);
		} catch (err) {
			console.error('Operation failed\n', err);
		}
	}
}
