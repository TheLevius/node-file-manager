export default (args) => args.reduce((acc, el) => {
	if (el.length > 2 && el.includes('--', 0)) {
		const [key, value] = el.split('=');
		const parsedKey = key.replace(/^--/, '');
		acc[parsedKey] = value;
	}
	return acc;
}, {});
