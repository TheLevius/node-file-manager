import {
	userInfo
} from 'node:os';
export default (username) => username ?? userInfo().username;
