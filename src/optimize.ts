export const optimizePackageTree = (info: PackageInfo) => {
  let dependencies = info.dependencies! as PackageInfo[];

  // This is a Divide & Conquer algorithm - we split the large problem into
  // subproblems that we solve on their own, then we combine their results
  // to find the final solution.
  //
  // In this particular case, we will say that our optimized tree is the
  // result of optimizing a single depth of already-optimized dependencies
  // (ie we first optimize each one of our dependencies independently, then
  // we aggregate their results and optimize them all a last time).
  dependencies = dependencies.map((dependency) => {
    return optimizePackageTree(dependency!);
  });

  // Now that our dependencies have been optimized, we can start working on
  // doing the second pass to combine their results together. We'll iterate
  // on each one of those "hard" dependencies (called as such because they are
  // strictly required by the package itself rather than one of its dependencies),
  // and check if they contain any sub-dependency that we could "adopt" as our own.
  for (let hardDependency of dependencies.slice()) {
    for (let subDependency of (hardDependency.dependencies! as MetaInfo[]).slice()) {
      // First we look for a dependency we own that is called just like the
      // sub-dependency we're iterating on.
      let availableDependency = dependencies.find((dependency) => {
        return dependency.name === subDependency.name;
      });

      // If there's none, great! It means that there won't be any collision
      // if we decide to adopt this one, so we can just go ahead.
      if (!availableDependency) {
        dependencies.push(availableDependency!);
      }

      // If we've adopted the sub-dependency, or if the already existing
      // dependency has the exact same version than the sub-dependency,
      // then it becames useless and we can simply delete it.
      if (!availableDependency || availableDependency!.version === subDependency.version) {
        (hardDependency.dependencies as MetaInfo[]).splice(
          (hardDependency.dependencies as MetaInfo[]).findIndex((dependency) => {
            return dependency.name === subDependency.name;
          })
        );
      }
    }
  }

  return {
    name: info.name,
    version: info.version,
    dependencies: dependencies,
  };
}