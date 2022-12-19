import { existsSync } from 'node:fs';
export default (paths) => {
	const results = paths.reduce((acc, path, index) => {
		const isExist = existsSync(path);
		if (!isExist) {
			acc.notExistIndexList.push(index);
		}
		acc.checkedPaths.push({ path, index, isExist });
		return acc;
	}, { notExistIndexList: [], checkedPaths: [] });

	results.status = results.notExistIndexList.length === 0 ? 'OK' : 'FAILED';

	return results;
}
