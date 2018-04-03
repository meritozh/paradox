/**
 * package basic description
 */
interface MetaInfo {
  name: string,
  version: string
}

/**
 * package info in package.json `dependencies` field
 */
interface JSONData {
  [index: string]: string
}

/**
 * package description
 */
interface PackageInfo extends MetaInfo {
  dependencies?: JSONData | MetaInfo[]
}