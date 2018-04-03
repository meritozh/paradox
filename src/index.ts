import { getPackageDependencyTree } from './package';
import { linkPackages } from './link';
import { optimizePackageTree } from './optimize'

import { resolve } from 'path';
import util, { error } from 'util';

const cwd = process.argv[2] || process.cwd();
let packageJSON: PackageInfo = require(resolve(cwd, 'test/package.json'));

const dependencies = (packageJSON.dependencies || {}) as JSONData;

packageJSON.dependencies = Object.keys(dependencies).map(
  (name: string) => {
    return { name: name, version: dependencies[name] };
  }
);

Promise.resolve().then(() => {
  return getPackageDependencyTree(packageJSON);
}).then((tree) => {
  return linkPackages(optimizePackageTree(tree), cwd);
}).catch((error: Error) =>{
  console.log(error.stack);
  process.exit(1);
});