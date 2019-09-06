const path = require('path')
const fs = require('fs')
const util = require('util')
const madge = require('madge')
const resolve = require('resolve-tree')
const resolvePackages = util.promisify(resolve.packages)

/**
 * This craziness attempts to determine which node_modules are
 * *not* used by source files in the given directory. In practice
 * it's used to exclude node_modules only used by front-end code,
 * since the packaged server ships with the front-end pre-compiled.
 *
 * @return {Array} package names
 */
module.exports = async function (dir) {
  const deps = await getRequires(dir)
  const childDeps = await resolveDeps(deps)
  const all = getAll()
  const unused = []

  all.forEach((m, i) => {
    if (!deps.includes(m) && !childDeps.includes(m)) {
      unused.push(m)
    }
  })

  return unused
}

/**
 * Get all directories in ./node_moduules
 * @return {Array}
 */
function getAll () {
  const dirs = fs.readdirSync('./node_modules')
  const out = []

  dirs.forEach(d => {
    if (!d.startsWith('@')) {
      out.push(d)
      return
    }

    const subDirs = fs.readdirSync(path.resolve('./node_modules', d))

    subDirs.forEach(s => {
      if (fs.statSync(path.resolve('./node_modules', d, s)).isDirectory()) {
        out.push(d + path.sep + s)
      }
    })
  })

  return out
}

/**
 * Get names of all npm packages require()d by files in a directory
 * @param  {String} dir starting search path
 * @return {Array}      package names
 */
async function getRequires (dir) {
  const names = new Set() // prevent dupes

  return madge(dir, { includeNpm: true })
    .then(res => res.obj())
    .then(files => {
      Object.keys(files).forEach(file => {
        files[file].forEach(f => {
          const name = getPackageName(f)
          if (name) names.add(name)
        })
      })

      return Array.from(names)
    })
}

/**
 * Get names of all child dependencies of the given npm package names
 * @param  {Array} packageNames package names
 * @return {Array} package names
 */
async function resolveDeps (packageNames = []) {
  const tree = await resolvePackages(packageNames)
  const names = resolve.flattenMap(tree, 'name')
  return Array.from(new Set(names))
}

/**
 * Convert require() string to npm package name (handles namespaces)
 * @param  {String} str
 * @return {String} package name
 */
function getPackageName (str) {
  const parts = str.split('/')
  const i = parts.indexOf('node_modules')
  if (i === -1) return false

  const ns = parts[i + 1].startsWith('@')
  return parts[i + 1] + (ns ? '/' + parts[i + 2] : '')
}