import fs from 'fs-extra'
;(async () => {
  fs.outputJSONSync(
    './package.json',
    JSON.parse(
      JSON.stringify({
        ...fs.readJsonSync('./package.json'),
        devDependencies: undefined,
        scripts: undefined,
        packageManager: undefined,
        engines: undefined,
      }),
    ),
    { spaces: 2 },
  )
})()
