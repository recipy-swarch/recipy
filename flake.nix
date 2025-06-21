{
  description = "Entorno de desarrollo con Minikube, Helm y Docker clásico";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs { inherit system; };
      in {
        devShell = pkgs.mkShell {
          buildInputs = with pkgs; [
            minikube
            kubernetes-helm
            jq
          ];

          shellHook = ''
            echo "🔧 Configurando entorno Minikube con Docker clásico..."

            # Forzar uso del Docker clásico
            export DOCKER_HOST=unix:///var/run/docker.sock

            # Alias convenientes
            alias kubectl='minikube kubectl'
            . <(minikube completion bash)
            . <(helm completion bash)

            # Verificar si el clúster minikube existe
            if ! minikube status -o json >/dev/null 2>&1; then
              echo "⚠️  El clúster de Minikube no existe. Ejecuta:"
              echo "    minikube start --driver=docker"
            else
              echo "✅ Clúster Minikube detectado"
              # Si el clúster está corriendo, aplicar docker-env
              if [ "$(minikube status -o json | jq -r .Host)" = "Running" ]; then
                echo "🔄 Aplicando configuración docker-env con sudo..."
                sudo -E minikube -p minikube docker-env | while read -r line; do eval "$line"; done
                . <(kubectl completion bash)
              else
                echo "⚠️  Minikube está detenido. Ejecuta:"
                echo "    minikube start --driver=docker"
              fi
            fi
          '';
        };
      });
}
