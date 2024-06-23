const Module = require(`module`)
const requireOriginal = Module.prototype.require

Module.prototype.require = function(filePath) {
  const absoluteDir = __filename.split(`/`).slice(0, -1).join(`/`)

  if (filePath[0] === `~`) {
    const newPath = filePath.replace(`~`, `${absoluteDir}/../app`)
    return requireOriginal.call(this, newPath)
  } else if (filePath[0] === `#`) {
    const newPath = filePath.replace(`#`, `${absoluteDir}/..`)
    return requireOriginal.call(this, newPath)
  }
  return requireOriginal.call(this, filePath)
}
