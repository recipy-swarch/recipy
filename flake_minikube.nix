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
            kubectl
            kompose
            kubernetes-helm
            jq
          ];

          shellHook = ''
            echo "🔧 Configurando entorno Minikube con Docker clásico..."

            # Forzar uso del Docker clásico
            export DOCKER_HOST=unix:///var/run/docker.sock

            # Cargar autocompletado para minikube y helm
            . <(minikube completion bash)
            . <(helm completion bash)

            # Usar minikube con docker
            minikube config set driver docker

            # Verificar si el clúster minikube existe
            if ! minikube status -o json >/dev/null 2>&1; then
              echo "🚀 No se encontró un clúster de Minikube. Iniciando..."
              minikube start --driver=docker
            fi

            # Verificar si el clúster está corriendo
            if [ "$(minikube status -o json | jq -r .Host)" = "Running" ]; then
              . <(kubectl completion bash)
              echo "🔄 Aplicando 'eval \$(minikube docker-env)' (usa Docker dentro del clúster)..."
              eval "$(minikube -p minikube docker-env)"
              echo "✅ Minikube está listo y en ejecución"

              # Habilitar addons necesarios si no están habilitados
              for addon in registry metrics-server; do
                if ! minikube addons list | grep -E "^$addon\s+enabled" >/dev/null; then
                  echo "➕ Habilitando addon '$addon'..."
                  minikube addons enable "$addon"
                else
                  echo "✅ Addon '$addon' ya está habilitado"
                fi
              done
            else
              echo "⚠️  Minikube no pudo iniciarse correctamente."
            fi
          '';
        };
      });
}
