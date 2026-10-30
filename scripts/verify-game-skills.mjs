// Validate the lightweight AI game-studio skill manifest using Node's stdlib.
// This is an offline structural check, NOT a claim that an AI agent executed a skill.
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const names = [
  'gdd-dinamico', 'backlog-gameplay', 'gameplay-fsm', 'gameplay-events',
  'engine-converter', 'debug-stacktrace', 'perf-audit', 'shader-port',
  'asset-prompts',
];
const requiredDocs = [
  'AGENTS.md', 'docs/AI_GAME_STUDIO.md',
  'docs/GDD_RE_DREAM.md', 'docs/BACKLOG_RE_DREAM.md',
];
let failures = 0;
for (const path of requiredDocs) {
  if (!existsSync(path)) {
    console.error('MISSING documentation:', path);
    failures++;
  }
}
for (const name of names) {
  const path = join('.claude', 'skills', name, 'SKILL.md');
  if (!existsSync(path)) {
    console.error('MISSING skill:', path);
    failures++;
    continue;
  }
  const source = readFileSync(path, 'utf8');
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/.exec(source);
  if (!match) {
    console.error('INVALID frontmatter:', path);
    failures++;
    continue;
  }
  const frontmatter = match[1];
  const body = match[2];
  const expected = new RegExp('^name:\\s*' + name + '$', 'm');
  if (!expected.test(frontmatter) || !/^description:\s*.+/m.test(frontmatter) ||
      !/^user-invocable:\s*true$/m.test(frontmatter) || body.trim().length < 180) {
    console.error('INCOMPLETE skill:', path);
    failures++;
    continue;
  }
  console.log('OK', name);
}
if (failures) {
  console.error('AI skill verification failed:', failures, 'problem(s)');
  process.exitCode = 1;
} else {
  console.log('Verified', names.length, 'skills and', requiredDocs.length, 'project documents.');
}
