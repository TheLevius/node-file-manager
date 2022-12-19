import { resolve } from 'node:path';

export default (paths) => paths.map((p) => resolve(p));
