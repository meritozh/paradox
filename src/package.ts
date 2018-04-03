import { readPackageJSONFromArchive } from './utils';

import semver from 'semver';
import fetch from 'node-fetch';
import fs from 'fs-extra';

/**
 * fetch then sycn a remote package to local disk
 * @param {MetaInfo} info meta package description
 */
const fetchPackage = async (info: MetaInfo): Promise<Buffer> => {
  if (['/', './', '../'].some(prefix => info.version.startsWith(prefix))) {
    return await fs.readFile(info.version);
  }

  if (semver.valid(info.version)) {
    return await fetchPackage({
      name: info.name,
      version: `https://registry.yarnpkg.com/${info.name}/-/${info.name}-${info.version}.tgz`,
    });
  }

  const response = await fetch(info.version);

  if (!response.ok) {
    throw new Error(`Couldn't fetch package "${info.name}"`);
  }

  return response.buffer();
}

/**
 * resolve version of package description
 * @param {MetaInfo} info meta package description
 */
const getPinnedReference = async (info: MetaInfo) => {
  if (semver.validRange(info.version) && !semver.valid(info.version)) {
    const response = await fetch(`https://registry.yarnpkg.com/${info.name}`);
    const package_info = await response.json();
    
    const versions = Object.keys(package_info['versions']);
    const maxSatisfying = semver.maxSatisfying(versions, info.version);

    if (maxSatisfying === null) {
      throw new Error(`Couldn't find a version matching "${info.version}" for package "${info.name}"`);
    }

    info.version = maxSatisfying;
  }
  return info;
}

/**
 * fetch info about dependencies of a package
 * @param {MetaInfo} info package description
 */
const getPackageDependencies = async (info: MetaInfo): Promise<MetaInfo[]> => {
  const packageBuffer = await fetchPackage(info);
  const packageJSON: PackageInfo = JSON.parse(await readPackageJSONFromArchive(packageBuffer));

  const dependencies = (packageJSON.dependencies || {}) as JSONData;

  return Object.keys(dependencies).map((name: string) => {
    return { name: name, version: dependencies[name] };
  });
}

/**
 * get tree structure about a package
 * @param {PackageInfo} info package description
 * @param {Map} available current pinned packages
 */
const getPackageDependencyTree = async (info: PackageInfo, available = new Map()): Promise<PackageInfo> => {
  return {
    name: info.name,
    version: info.version,
    dependencies: await Promise.all(
      (info.dependencies! as MetaInfo[])
        .filter(volatileDependency => {
          const availableVersion = available.get(volatileDependency.name);

          // If the volatile version exactly matches the available version (for
          // example in the case of two URLs, or two file paths), it means that
          // it is already satisfied by the package provided by its parent. In
          // such case, we can safely ignore this dependency.
          if (volatileDependency.version === availableVersion) {
            return false;
          }

          // If the volatile dependency is a semver range, and if the package
          // provided by its parent satisfies it, we can also safely ignore
          // the dependency.
          if (semver.validRange(volatileDependency.version) &&
              semver.satisfies(availableVersion, volatileDependency.version)) {
            return false;
          }

          return true;
        })
        .map(async (volatileDependency) => {
          const pinnedDependency = await getPinnedReference(volatileDependency);
          const subDependencies = await getPackageDependencies(pinnedDependency);

          const subAvailable = new Map(available);
          subAvailable.set(pinnedDependency.name, pinnedDependency.version);

          return await getPackageDependencyTree(
            Object.assign({}, pinnedDependency, { dependencies: subDependencies }),
            subAvailable
          );
        })
    )
  };
}

export { 
  getPackageDependencyTree,
  fetchPackage
}