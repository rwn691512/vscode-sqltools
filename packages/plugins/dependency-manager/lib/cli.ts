import commandExists from '@sqltools/util/dependencies/command-exists';
import execPromise from './execPromise';
import { SpawnOptions } from 'child_process';
import { getDataPath } from '@sqltools/util/path';

export function cli(command: string, args: ReadonlyArray<string>, options: SpawnOptions = {}) {
  if (!commandExists(command)) {
    throw new Error(`${command} Not found. You need to install ${command} first to install dependencies. Install it and restart before continue.`);
  }
  return execPromise(command, args, { shell: true, cwd: getDataPath(), ...options });
}

export default cli;