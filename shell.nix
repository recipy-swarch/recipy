{ pkgs ? import <nixpkgs> {} }:

pkgs.mkShell {
  packages = [
    pkgs.python313Full
    pkgs.python313Packages.venvShellHook
  ];

  shellHook = ''
    export DOCKER_HOST=unix:///var/run/docker.sock
    echo "DOCKER_HOST set to $DOCKER_HOST"
    python3 --version
    if [ ! -d ".venv" ]; then
      python -m venv .venv
    fi
    source .venv/bin/activate
    pip install --upgrade pip
    pip install requests
  '';
}
