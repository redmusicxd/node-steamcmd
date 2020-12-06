# steamcmd

Call SteamCMD from Node.js

## Install

SteamCMD works faster if all its [required ports](https://support.steampowered.com/kb_article.php?ref=8571-GLVN-8711)
are available:
* UDP 27015 through 27030
* TCP 27015 through 27030

## Usage

```js
import steamcmd from 'steamcmd';

steamcmd.install();
//=> returns a Promise for installing steamcmd locally
steamcmd.check();
//=> returns a Promise for ensuring that steamcmd is updated and dependencies exist
steamcmd.getAppInfo(730);
//=> returns a Promise for the app info of appID 730
```

## API

### steamcmd.install([opts])
Downloads SteamCMD for the current OS into `opts.binDir`
unless `opts.binDir` already exists and is accessible.

### steamcmd.check([opts])
Ensures SteamCMD is usable by running it with no arguments and exiting.

### steamcmd.getAppInfo(appid[, opts])
Asks SteamCMD to get the latest app info for the given app.

## Configuration

All functions take an optional options parameter.

#### binDir

type: string
default: `path.join(__dirname, 'steamcmd_bin')`

The directory to use when downloading and running `steamcmd` itself.
Defaults to `steamcmd_bin` in the same directory where this package is installed.
