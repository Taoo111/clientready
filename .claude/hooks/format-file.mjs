// PostToolUse hook: formats the file Claude just edited with the repo's Prettier config.
// Never blocks the edit: anything unexpected is reported on stderr and the hook exits 0.
import { readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = path.resolve(process.env.CLAUDE_PROJECT_DIR ?? process.cwd());

async function readStdin() {
  let data = '';
  for await (const chunk of process.stdin) data += chunk;
  return data;
}

async function main() {
  const input = JSON.parse(await readStdin());
  const file = input?.tool_input?.file_path;
  if (typeof file !== 'string') return;

  const absolute = path.resolve(root, file);
  // Only files inside this repository.
  if (path.relative(root, absolute).startsWith('..')) return;

  const require = createRequire(path.join(root, 'package.json'));
  const loaded = await import(pathToFileURL(require.resolve('prettier')).href);
  const prettier = loaded.default ?? loaded;
  const info = await prettier.getFileInfo(absolute, {
    ignorePath: path.join(root, '.prettierignore'),
    resolveConfig: true,
  });
  if (info.ignored || !info.inferredParser) return;

  const source = await readFile(absolute, 'utf8');
  const options = (await prettier.resolveConfig(absolute)) ?? {};
  const formatted = await prettier.format(source, { ...options, filepath: absolute });
  if (formatted !== source) await writeFile(absolute, formatted);
}

main().catch((error) => {
  // A syntax error mid-edit is normal; report it without failing the tool call.
  console.error(`[format-file] ${error instanceof Error ? error.message.split('\n')[0] : error}`);
});
