#!/usr/bin/env node

const fs = require('fs-extra');
const chalk = require('chalk');
const deepDiff = require('deep-diff');
const argv = require('yargs-parser')(process.argv);
const { source, target } = argv;

// Convert to JSON
function convertLockToJson(yarnLockContent) {
  const lines = yarnLockContent.split(/[\r\n]+/).filter((line) => line[0] !== '#' && line.trim());

  // marker
  const fullMap = {};
  let lastObj = null;

  // loop lines
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line[0] !== ' ') {
      lastObj = {};
      fullMap[line] = lastObj;
    } else if (line.slice(0, 2) === '  ') {
      const [key, value] = line.trim().split(' ');

      if (key && value) {
        lastObj[key] = value;
      }
    }
  }

  // Post process
  const versionMap = {};
  Object.keys(fullMap).forEach((name) => {
    const version = fullMap[name].version;

    const names = name.split(',').map((n) => {
      const ori = n.trim();
      return ori.replace(/^("?)(.*)@.*/, '$2');
    });

    const matchName = names[0];

    const versions = (versionMap[matchName] = versionMap[matchName] || []);
    if (!versions.includes(version)) {
      versions.push(version);
    }

    versions.sort();
  });

  return versionMap;
}

// read the source file and convert from yaml to json
const src = fs.readFileSync(source, 'utf8');
const srcJson = convertLockToJson(src);

// read the target file and convert from yaml to json
const tgt = fs.readFileSync(target, 'utf8');
const tgtJson = convertLockToJson(tgt);

// compare the two json objects
const diffList = deepDiff.diff(srcJson, tgtJson);

// Print the diff
if (diffList && diffList.length) {
  const diffNames = new Set(diffList.map(({ path }) => path[0]));
  diffNames.forEach((name) => {
    console.log(name);
    console.log(chalk.red('--', (srcJson[name] || []).join(', ')));
    console.log(chalk.green('++', (tgtJson[name] || []).join(', ')));
  });
} else {
  console.log(chalk.green('🎉 Nothing changed'));
}
