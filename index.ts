#! /usr/bin/env bun

import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { SourceMapConsumer } from 'source-map';
import { remove } from 'fs-extra';
import arg from 'arg';
import chalk from 'chalk';

type File = {
  source: string;
  content: string | null;
};

const NAME = 'srcsrv';
const CACHE_DIR = '.cache';

const USAGE = `
  ${chalk.bold(`⌁ ${NAME}`)} [options] <url>

  ${chalk.dim('Fetch and extract source files from a source map')}

  ${chalk.dim('Options:')}

    -o, --output <output>   Output directory ${chalk.dim('(default: ./.output)')}
    -n, --no-cache          Disable cache. Requests are cached by default ${chalk.dim(`(stored in ${CACHE_DIR})`)}

  ${chalk.dim('Examples:')}

    ${chalk.cyan(`${NAME} https://example.com/main.js`)}
    ${chalk.cyan(`${NAME} https://example.com/main.js -o ./output`)}
    ${chalk.cyan(`${NAME} https://example.com/main.js --no-cache`)}
`;

const args = arg({
  '--output': String,
  '--no-cache': Boolean,
  '--verbose': Boolean,
  '--help': Boolean,
  '-o': '--output',
  '-n': '--no-cache'
});

if (args['--help']) {
  console.log(USAGE);
  process.exit(0);
}

const url = args._[0];

if (!url) {
  console.log(USAGE);
  process.exit(1);
}

const verbose = args['--verbose'];

const logVerbose = (...args: any[]) => {
  if (verbose) {
    console.log(...args);
  }
}

async function main() {
  const outputDir = args['--output'] || './.output';
  
  logVerbose('Fetching JS file...');

  const jsContent = await fetchText(url);
  const sourceMapUrl = extractSourceMapURL(jsContent);

  if (!sourceMapUrl) {
    console.log(chalk.red('No source map URL found'));
    return;
  }

  const resolvedSourceMapUrl = new URL(sourceMapUrl, url);

  logVerbose('Fetching source map...');
  const sourceMap = await fetchText(resolvedSourceMapUrl);

  logVerbose('Building files...');
  const files = await buildFiles(sourceMap);

  await remove(outputDir);

  await writeFiles(files, outputDir);
}

async function fetchText(url: URL | string): Promise<string> {
  const cacheKey = Bun.hash(
    typeof url === 'string' ? url : url.href
  ).toString();
  const cachePath = join(CACHE_DIR, cacheKey);

  async function getAndCache(url: URL | string) {
    const response = await fetch(url);
    const content = await response.text();

    await mkdir(CACHE_DIR, { recursive: true });
    await writeFile(cachePath, content);

    return content;
  }

  // Skip cache if --no-cache flag is passed
  if (args['--no-cache']) {
    return getAndCache(url);
  }

  try {
    const cachedContent = await readFile(cachePath, 'utf-8');
    return cachedContent;
  } catch (error) {
    return getAndCache(url);
  }
}

function extractSourceMapURL(jsContent: string) {
  const regex = /\/\/# sourceMappingURL=(.+)/;
  const match = jsContent.match(regex);

  return match?.[1];
}

async function buildFiles(sourceMap: string) {
  const consumer = await new SourceMapConsumer(sourceMap);
  const files: File[] = [];

  consumer.sources.forEach((source, index) => {
    files.push({
      source,
      content: consumer.sourceContentFor(source, true)
    });
  });

  consumer.destroy();

  return files;
}

async function writeFiles(files: File[], outputDir: string) {
  logVerbose('Writing files...');

  for (const { source, content } of files) {
    // Omit sources that include query params
    if (source.includes('?')) {
      logVerbose(chalk.dim(`${'Skipped'.padStart(10)}  ${source}`));
      continue;
    }

    const pathname = new URL(source).pathname;
    const fullPath = join(outputDir, pathname);
    const dirPath = dirname(fullPath);

    await mkdir(dirPath, { recursive: true });
    await writeFile(fullPath, content || '');

    logVerbose(`${chalk.cyan('Extracted'.padStart(10))}  ${source}`);
  }
}

main();
