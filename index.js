import axios from 'axios';
import { join } from 'path';
import { spawn } from 'child-process-promise';
import { parse } from '@node-steam/vdf';

const { stat } = require('fs').promises;

var _ = {}
_.defaults = require('lodash.defaults')

var defaultOptions = {
	binDir: join(__dirname, 'steamcmd_bin')
}

const download = function (opts) {
	opts = _.defaults(opts, defaultOptions);
	let url, extractor;
	return new Promise(function (resolve, reject) {
		if (process.platform === 'win32') {
			url = 'https://steamcdn-a.akamaihd.net/client/installer/steamcmd.zip'
			extractor = require('unzipper');
		} else if (process.platform === 'darwin') {
			url = 'https://steamcdn-a.akamaihd.net/client/installer/steamcmd_osx.tar.gz'
			extractor = require('tar');
		} else if (process.platform === 'linux') {
			url = 'https://steamcdn-a.akamaihd.net/client/installer/steamcmd_linux.tar.gz'
			extractor = require('tar');
		} else {
			reject(Error('Unsupported platform'));
		}
		axios(url, { responseType: 'stream' })
			.then((res) => {
				let buffer = res.data;
				if (process.platform !== 'win32') {
					buffer = buffer.pipe(require('zlib').createGunzip())
				}
				buffer.pipe(
					extractor.Extract({ path: opts.binDir })
						.on('finish', resolve)
						.on('error', reject)
				)
			})
			.catch((e) => reject(e));
	})
}

const run = function (commands, opts) {
	opts = _.defaults(opts, defaultOptions)
	let exeName
	if (process.platform === 'win32') {
		exeName = 'steamcmd.exe'
	} else if (process.platform === 'darwin') {
		exeName = 'steamcmd.sh'
	} else if (process.platform === 'linux') {
		exeName = 'steamcmd.sh'
	} else {
		return _reject('Unsupported platform')
	}
	var args = commands.concat('quit').map(function (x) {
		return '+' + x
	}).join(' ').split(' ')
	return new Promise(function (resolve, reject) {
		spawn(join(opts.binDir, exeName), args, {
			capture: ['stdout', 'stderr'],
			cwd: opts.binDir
		})
		.then((x) => { 
			resolve(x); 
		})
		.catch((x) => {
			// For some reason, steamcmd will occasionally exit with code 7 and be fine.
			// This usually happens the first time touch() is called after download().
			(x.code === 7) ? resolve(x) : reject(x)
		})
	})
}

const check = function (opts) {
	opts = _.defaults(opts, defaultOptions)
	return run([], opts)
}

const getAppInfo = function (appID, opts) {
	opts = _.defaults(opts, defaultOptions)

	// The first call to app_info_print from a new install will return nothing,
	// and it will instead prep an entry for the info and request it.
	// It won't block though, and if the session closes before it can save,
	// the same issue will be present on next run.
	// Thus we use `app_update` to force the session to wait long enough to save.
	var forceInfoCommand = [
		'@ShutdownOnFailedCommand 0', 'login anonymous',
		'app_info_print ' + appID,
		'force_install_dir ./4', 'app_update 4'
	]

	// The output from app_update can collide with that of app_info_print,
	// so after ensuring the info is available we must re-run without app_update.
	var fetchInfoCommand = [
		'@ShutdownOnFailedCommand 0', 'login anonymous',
		'app_info_update 1', // force data update
		'app_info_print ' + appID,
		'find e' // fill the buffer so info's not truncated on Windows
	]

	return new Promise((resolve, reject) => {
		run(forceInfoCommand, opts) // @todo only force when needed
			.then(() => {
				return run(fetchInfoCommand, opts)
			})
			.then((proc) => {
				var stdout = proc.stdout.replace('\r\n', '\n')
				var infoTextStart = stdout.indexOf('"' + appID + '"')
				var infoTextEnd = stdout.indexOf('ConVars:')
				var infoText = stdout.substr(infoTextStart, infoTextEnd - infoTextStart)
				return resolve(parse(infoText)[appID]);
			})
			.catch((e) => reject(e));
	});
}

const install = function (opts) {
	opts = _.defaults(opts, defaultOptions)
	return new Promise((resolve, reject) => {
		download(opts)
			.then(() => { 
				return new Promise(resolve => setTimeout(resolve, 500))})
			.then(() => { 
				return check(opts); 
			})
			.then(() => { 
				return resolve(); 
			})
			.catch((e) => { 
				reject(e); 
			});
	});
}

export default {
	install,
	check,
	getAppInfo
}
