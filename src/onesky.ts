import 'colors';
import * as inquirer from 'inquirer';
import * as util from 'util';
import * as fs from 'fs';

const writeFile = util.promisify(fs.writeFile);

export const oneskySetup = async () => {
  console.log(
    `Go to ${
      'http://cru-global.oneskyapp.com/admin/site/settings'.cyan
    } and copy and paste your OneSky API keys`,
  );
  const {
    oneskyApiKey,
    oneskySecretKey,
  }: {
    oneskyApiKey: string;
    oneskySecretKey: string;
  } = await inquirer.prompt([
    {
      type: 'input',
      name: 'oneskyApiKey',
      message: 'Public Key',
    },
    {
      type: 'input',
      name: 'oneskySecretKey',
      message: 'Secret Key',
    },
  ]);
  await writeFile(
    `${process.env.HOME}/code/missionhub-react-native/.env.local`,
    `ONESKY_API_KEY=${oneskyApiKey}\nONESKY_SECRET_KEY=${oneskySecretKey}`,
  );
};
