if ! command -v brew >/dev/null; then
  echo "Installing Homebrew..."
  curl -fsS \
    'https://raw.githubusercontent.com/Homebrew/install/master/install' | ruby

  export PATH="/usr/local/bin:$PATH"
fi

if ! command -v node >/dev/null; then
  echo "Installing NodeJS..."
  brew install node
fi

# clone repo
# install QA script
