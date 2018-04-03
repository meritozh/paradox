import { extractNpmArchiveTo } from './utils';
import { fetchPackage } from './package';

import fs from 'fs-extra';
import path, { relative } from 'path';
import cp, { exec } from 'child_process';

/**
 * fetch packages to disk
 * @param {PackageInfo} info package description
 * @param {string} cwd current workspace path
 */
export const linkPackages = async (info: PackageInfo, cwd: string) => {
  // As we previously seen, the root package will be the only one containing
  // no version. We can simply skip its linking, since by definition it
  // already contains the entirety of its own code :)
  if (info.version) {
    const packageBuffer = await fetchPackage(info);
    await extractNpmArchiveTo(packageBuffer, cwd);
  }

  await Promise.all(
    (info.dependencies! as MetaInfo[]).map(async (dependency) => {
      const target = `${cwd}/node_palace/${dependency.name}`;
      const binTarget = `${cwd}/node_palace/.bin`;

      await linkPackages(dependency, target);

      const dependencyPackageJSON = require(`${target}/package.json`);
      let bin = dependencyPackageJSON.bin || {};

      if (typeof bin === 'string') {
        bin = { [name]: bin };
      }

      for (let binName of Object.keys(bin)) {
        const source = path.resolve(target, bin[binName]);
        const dest = `${binTarget}/${binName}`;

        await fs.mkdirp(`${cwd}/node_palace/.bin`);
        await fs.symlink(relative(binTarget, source), dest);
      }

      await linkPackages(dependency, `${cwd}/node_palace/${dependency.name}`);

      if (dependencyPackageJSON.scripts) {
        for (let scriptName of ['preinstall', 'install', 'postinstall']) {
          const script = dependencyPackageJSON.scripts[scriptName];

          if (!script) continue;

          await exec(script, {
            cwd: target,
            env: Object.assign({}, process.env, {
              PATH: `${target}/node_palace/.bin:${process.env.PATH}`
            })
          });
        }
      }
    })
  );
}