import {
	dirname,
	join
} from 'path';
import {
	fileURLToPath
} from 'url';

export const defineAbsPath = (url) => {
	const __filename = fileURLToPath(url);

	return (filename = '', subDir = '') => {
		const __dirname = dirname(__filename);
		const absPath = join(__dirname, subDir, filename);
		return absPath;
	}
}
