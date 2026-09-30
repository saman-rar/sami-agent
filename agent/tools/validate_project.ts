import { defineTool } from "eve/tools";
import { z } from "zod";
import { requireProjectMutationApproval } from "../lib/approval-policy";

export default defineTool({
  description:
    "Run the project's required final TypeScript/type check and lint check before Build mode commits. This tool discovers the package manager and package scripts. Both checks must succeed before Git commit/push finalization.",
  inputSchema: z.object({}),
  approval: requireProjectMutationApproval,
  async execute(_input, ctx) {
    const sandbox = await ctx.getSandbox();
    return sandbox.run({
      command: `node - <<'NODE'
const fs = require('fs');
const cp = require('child_process');

function exists(path) {
  try {
    return fs.existsSync(path);
  } catch {
    return false;
  }
}

function run(command) {
  process.stdout.write('\n> ' + command + '\n');
  const result = cp.spawnSync(command, { shell: true, stdio: 'inherit' });
  if ((result.status ?? 1) !== 0) process.exit(result.status ?? 1);
}

if (!exists('package.json')) {
  console.error('No package.json found at repository root; cannot run the required type and lint validation.');
  process.exit(2);
}

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const scripts = pkg.scripts || {};
const declaredManager =
  typeof pkg.packageManager === 'string' ? pkg.packageManager.split('@')[0] : undefined;
const runner =
  declaredManager ||
  (exists('pnpm-lock.yaml')
    ? 'pnpm'
    : exists('yarn.lock')
      ? 'yarn'
      : exists('bun.lockb') || exists('bun.lock')
        ? 'bun'
        : 'npm');

function script(name) {
  if (runner === 'yarn') return 'yarn ' + name;
  return runner + ' run ' + name;
}

let typeCommand;
for (const name of ['typecheck', 'type-check', 'check:types', 'types']) {
  if (scripts[name]) {
    typeCommand = script(name);
    break;
  }
}
if (!typeCommand && (exists('tsconfig.json') || exists('tsconfig.build.json'))) {
  if (exists('./node_modules/.bin/tsc')) {
    typeCommand = './node_modules/.bin/tsc --noEmit';
  }
}

const lintCommand = scripts.lint
  ? script('lint')
  : exists('./node_modules/.bin/eslint')
    ? './node_modules/.bin/eslint .'
    : undefined;

if (!typeCommand) {
  console.error('No TypeScript/type-check command could be discovered. Add a typecheck script or install TypeScript before Build mode can auto-commit.');
  process.exit(3);
}
if (!lintCommand) {
  console.error('No lint command could be discovered. Add a lint script or install ESLint before Build mode can auto-commit.');
  process.exit(4);
}

run(typeCommand);
run(lintCommand);
console.log('\nType check and lint both passed.');
NODE`,
    });
  },
});
