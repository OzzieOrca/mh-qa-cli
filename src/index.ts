import {Command, flags} from '@oclif/command'

const util = require('util');
const exec = util.promisify(require('child_process').exec);
const {cli} = require('cli-ux')

class MhQaCli extends Command {
  static description = 'describe the command here'

  static flags = {
    // add --version flag to show CLI version
    version: flags.version({char: 'v'}),
    help: flags.help({char: 'h'}),
  }

  static args = [{name: 'branch'}]

  async run() {
    const {args} = this.parse(MhQaCli)
    const branch = args.branch || await ask_for_branch()

    if(branch == 'quit' || branch == 'exit' || branch == '') return console.log('fine.......');

    if(branch == 'setup') return await setup();

    await checkout_brach(branch)
    await yarn_install()
    await pods()
    launch()
  }
}

async function ask_for_branch() {
  console.log('Which branch would you like to QA?')
  console.log('You can say:')
  console.log('setup - This will make sure you have all that you need to run MissionHub React Native')
  console.log('master - This is the version of the app that should be on the app store')
  console.log('exit - To get out of here')
  console.log('or any branch given to you by a programmer')
  return await cli.prompt('Which branch?')
}

async function setup() {
  if(await ensure_brew()) {
    console.log("Homebrew ✅")
  } else {
    return console.log("Homebrew not installed, that's the one thing I can't help with...")
  }

  if(!await install_git()) return 'error installing git';
  if(!await install_cocopods()) return 'error installing cocopods';
  if(!await install_rn_cli()) return 'error installing react-native-cli';
  if(!await install_yarn()) return 'error installing yarn';
  if(!await setup_env()) return 'error setting up env';
}

async function ls() {
  const { stdout, stderr } = await exec('ls');
  console.log('stdout:', stdout);
  console.log('stderr:', stderr);
}

async function checkout_brach(branch:string) {
  cli.action.start('checking out branch: ' + branch)
  await exec('cd ~/code/missionhub-react-native && git fetch origin ' + branch)
  await exec('cd ~/code/missionhub-react-native && git checkout -f origin/' + branch)
  cli.action.stop()
}

async function yarn_install() {
  cli.action.start('installing js dependancies')
  await exec('cd ~/code/missionhub-react-native && yarn')
  cli.action.stop()
}

async function pods() {
  cli.action.start('installing iOS pods')
  await exec('cd ~/code/missionhub-react-native && yarn ios:pod')
  cli.action.stop()
}

async function launch() {
  cli.action.start('building and launching on simulator')
  await exec('cd ~/code/missionhub-react-native && yarn ios --configuration Release')
  cli.action.stop()
}

async function ensure_brew() {
  try {
    await exec('command -v brew')
    return true
  } catch {
    return false
  }
}

async function install_git() {
  try {
    await exec('command -v git')
    console.log("git ✅")
    return true
  } catch {}

  try {
    cli.action.start('git not found, trying to install')
    await exec('brew install git')
    cli.action.stop("git ✅")
    return true
  } catch {
    console.log("error installing git! 😢")
    return false
  }
}

async function install_cocopods() {
  try {
    await exec('command -v pod')
    console.log("cocopods ✅")
    return true
  } catch {}

  try {
    cli.action.start('cocopods not found, trying to install')
    await exec('gem install cocopods')
    cli.action.stop("cocopods ✅")
    return true
  } catch {
    console.log("error installing cocopods! 😢")
    return false
  }
}

async function install_rn_cli() {
  try {
    await exec('command -v react-native')
    console.log("react-native ✅")
    return true
  } catch {}

  try {
    cli.action.start('react-native not found, trying to install')
    await exec('npm install -g react-native-cli')
    cli.action.stop("react-native ✅")
    return true
  } catch {
    console.log("error installing react-native! 😢")
    return false
  }
}

async function install_yarn() {
  try {
    await exec('command -v yarn')
    console.log("yarn ✅")
    return true
  } catch {}

  try {
    cli.action.start('yarn not found, trying to install')
    await exec('brew install yarn')
    cli.action.stop("yarn ✅")
    return true
  } catch {
    console.log("error installing yarn! 😢")
    return false
  }
}

async function setup_env() {
  try {
    await exec('ls ~/code/missionhub-react-native/.env')
    return true
  } catch {}

  try {
    console.log("adding .env")
    await exec("echo 'API_BASE_URL=https://api-stage.missionhub.com' > ~/code/missionhub-react-native/.env")
    return true
  } catch {
    console.log("error adding env var! 😢")
    return false
  }
}

export = MhQaCli
