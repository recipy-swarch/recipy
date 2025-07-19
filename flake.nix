{
  description = "Dev env for GKE with gcloud and kubectl";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs { inherit system; };

        gcloud = pkgs.google-cloud-sdk.withExtraComponents (with pkgs.google-cloud-sdk.components; [
          gke-gcloud-auth-plugin
        ]);

      in {
        devShells.default = pkgs.mkShell {
          name = "gke-env";

          packages = [
            gcloud
            pkgs.kubectl
            pkgs.bash-completion  # opcional
            pkgs.git              # opcional
          ];

          shellHook = ''
            echo "Bienvenido al entorno de GKE (gcloud + kubectl)"
            echo "Autentica con: gcloud auth login"
          '';
        };
      });
}
