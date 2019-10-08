import { Command, flags } from '@oclif/command';
import { cli } from 'cli-ux';
import * as inquirer from 'inquirer';
import 'colors';
import { exec as execCallback } from 'child_process';
import * as util from 'util';
import * as fs from 'fs';

import { setup } from './setup';
import { oneskySetup } from './onesky';

const exec = util.promisify(execCallback);
const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);

type Mode = 'ios' | 'android' | 'setup' | 'oneskySetup' | 'exit';
type ApiEnv = 'staging' | 'production';

class MhQaCli extends Command {
  static description = 'Run the MissionHub React Native app for QA';

  static flags = {
    version: flags.version({ char: 'v' }),
    help: flags.help({ char: 'h' }),
  };

  static args = [
    {
      name: 'mode',
      description:
        'Action to perform. One of: iOS, android, setup, oneskySetup, exit',
    },
    { name: 'branch', description: 'Git branch to build' },
    {
      name: 'apiEnv',
      description:
        'API environment to test against. One of: staging, production',
    },
  ];

  async run() {
    const {
      args,
    }: { args: { mode: Mode; branch: string; apiEnv: ApiEnv } } = this.parse(
      MhQaCli,
    );
    console.log('🌤️  MissionHub QA CLI  ⛰'.cyan);

    const {
      mode,
    }: {
      mode: Mode;
    } = args.mode
      ? { mode: args.mode }
      : await inquirer.prompt([
          {
            type: 'list',
            name: 'mode',
            message: 'What would you like to do?'.yellow,
            choices: [
              { name: '🍏  Run iOS Simulator', value: 'ios' },
              { name: '🤖  Run Android emulator', value: 'android' },
              new inquirer.Separator(),
              { name: '🛠️  Setup dev tools', value: 'setup' },
              { name: '🌌  Setup OneSky keys', value: 'oneskySetup' },
              { name: '❌  Exit', value: 'exit' },
            ],
          },
        ]);

    switch (mode) {
      case 'ios':
        // TODO: add API env selection
        await prepareForBuild(args.branch, args.apiEnv);
        await pods();
        await launchIos();
        return;
      case 'android':
        await prepareForBuild(args.branch, args.apiEnv);
        await launchAndroid();
        return;
      case 'setup':
        return await setup();
      case 'oneskySetup':
        return await oneskySetup();
      case 'exit':
        return;
    }
  }
}

const prepareForBuild = async (argBranch: string, apiEnv: ApiEnv) => {
  const branch = argBranch || (await askForBranch());
  await setApiEnv(apiEnv);
  await checkoutBranch(branch);
  await yarn();
  await oneskyDownload();
};

async function askForBranch() {
  const { branch }: { branch: string } = await inquirer.prompt([
    {
      type: 'list',
      name: 'branch',
      message: 'Which branch would you like to QA?'.yellow,
      choices: await fetchBranches(),
    },
  ]);
  return branch;
}

async function fetchBranches() {
  cli.action.start('👀  Fetching branches');

  const { stdout } = await exec(
    "cd ~/code/missionhub-react-native && git ls-remote -q --heads | awk '{print $2}'",
  );

  const sortPriority = (branch: string) =>
    branch === 'develop'
      ? 3
      : branch === 'master'
      ? 2
      : branch.match(/^MHP-/i)
      ? 1
      : 0;

  const branches = stdout
    .split('\n')
    .filter(Boolean)
    .map(branch => branch.trim().replace('refs/heads/', ''))
    .sort(
      (a, b) =>
        sortPriority(b) - sortPriority(a) ||
        a.localeCompare(b, undefined, { sensitivity: 'base' }),
    );

  cli.action.stop();

  return branches;
}

const setApiEnv = async (apiEnvArg: ApiEnv) => {
  const { apiEnv }: { apiEnv: ApiEnv } = apiEnvArg
    ? { apiEnv: apiEnvArg }
    : await inquirer.prompt([
        {
          type: 'list',
          name: 'apiEnv',
          message: 'Which API environment would you like to test against?'
            .yellow,
          choices: ['staging', 'production'],
        },
      ]);

  const apiUri =
    apiEnv === 'production'
      ? 'https://api.missionhub.com'
      : 'https://api-stage.missionhub.com';

  const envFilePath = `${process.env.HOME}/code/missionhub-react-native/.env`;

  const envContents = await readFile(envFilePath, 'utf8');
  await writeFile(
    envFilePath,
    envContents.replace(/API_BASE_URL=.*\n/, `API_BASE_URL=${apiUri}\n`),
  );
};

async function checkoutBranch(branch: string) {
  cli.action.start('🚛  Checking out branch: ' + branch);
  await exec(`cd ~/code/missionhub-react-native && git fetch origin ${branch}`);
  await exec(
    `cd ~/code/missionhub-react-native && git checkout -f origin/${branch}`,
  );
  cli.action.stop();
}

async function yarn() {
  cli.action.start('🧶  Installing JS dependencies');
  await exec('cd ~/code/missionhub-react-native && yarn');
  cli.action.stop();
}

async function oneskyDownload() {
  cli.action.start('💬  Downloading translations from OneSky');
  try {
    await exec('cd ~/code/missionhub-react-native && yarn onesky:download');
  } catch {
    console.log(
      "⚠️  Warning: Translations not downloaded. Make sure you've configured OneSky API Keys. Continuing..."
        .yellow,
    );
  }
  cli.action.stop();
}

async function pods() {
  cli.action.start('📦  Installing iOS pods');
  await exec('cd ~/code/missionhub-react-native && yarn ios:pod');
  cli.action.stop();
}

async function launchIos() {
  cli.action.start('📲  Building and launching on iOS simulator');
  try {
    await exec(
      'cd ~/code/missionhub-react-native && yarn ios --configuration Release',
    );
  } catch (e) {
    console.error(e.stdout.red);
  }
  cli.action.stop();
}

async function launchAndroid() {
  cli.action.start('📲  Building and launching on Android emulator');
  exec('~/Library/Android/sdk/emulator/emulator -avd missionhub-qa-cli &');
  try {
    await exec(
      'cd ~/code/missionhub-react-native && ANDROID_SDK_ROOT=/Users/scottywaggoner/Library/Android/sdk yarn android',
    );
  } catch (e) {
    console.error(e.stdout.red);
  }
  cli.action.stop();
}

export = MhQaCli;
