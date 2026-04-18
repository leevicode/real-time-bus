{
  description = "RealTimeBus Nix dev environment for React + Node.js";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
        nodejs = pkgs.nodejs_20;

        commonShell = pkgs.mkShell {
          buildInputs = with pkgs; [
            nodejs
            nodePackages.typescript
            nodePackages.typescript-language-server
            nodePackages.eslint

            # Utility tools
            curl
            jq
            git
          ];

          shellHook = ''
            if [ ! -d server/node_modules ]; then
              echo "Installing backend dependencies..."
              (cd server && npm ci)
            fi

            if [ ! -d app/node_modules ]; then
              echo "Installing frontend dependencies..."
              (cd app && npm ci)
            fi

            echo "RealTimeBus Development Environment"
            echo "Node.js version: $(node --version)"
            echo "npm version: $(npm --version)"
            echo ""
            echo "Available services:"
            echo "  • Backend:  cd server && npm run dev"
            echo "  • Frontend: cd app && npm run dev"
            echo ""

            # Add node_modules binaries to PATH.
            export PATH="$PWD/server/node_modules/.bin:$PWD/app/node_modules/.bin:$PATH"
         '';
        };

        # Minimal dependency shell for CI.
        ciShell = pkgs.mkShell {
          buildInputs = with pkgs; [
            nodejs
          ];

          shellHook = ''
            echo "Installing dependencies..."
            (cd server && npm ci)
            (cd app && npm ci)
          '';
        };

        # Build the backend server as a Nix derivation.
        server = pkgs.buildNpmPackage {
          name = "server";
          src = ./server;

          npmDepsHash = "sha256-UmMHN4bZG8WQNtBB9pqb3wNZWsLGOMFxA2oQQIajnb8=";

          buildPhase = ''
           runHook preBuild
           npm run build
           runHook postBuild
          '';

          installPhase = ''
            runHook preInstall
            mkdir -p $out/{lib,bin}
            cp -r dist package.json node_modules $out/lib/
            cat > $out/bin/backend-server << EOF
#!/bin/sh
export NODE_PATH="$out/lib/node_modules"
exec ${nodejs}/bin/node $out/lib/dist/index.js
EOF
            chmod +x $out/bin/backend-server
            runHook postInstall
          '';
        };

        # Build the frontend as a Nix derivation.
        app = pkgs.buildNpmPackage {
          name = "app";
          src = ./app;
          npmDepsHash = "sha256-G9H/1zTts0yXqCMy73GiWNbtAzNUiaDCFGfKoyF02Us=";

          buildPhase = ''
            runHook preBuild
            npm run build
            runHook postBuild
          '';

          installPhase = ''
            runHook preInstall
            mkdir -p $out
            cp -r dist $out/
            runHook postInstall
          '';
        };

      in
      {
        # Local development shell.
        devShells.default = commonShell;

        # CI-specific shell.
        devShells.ci = ciShell;

        # Packages
        packages = {
          inherit server app;
          default = app;
        };

        # For NixOS services
        nixosModules.default = { config, lib, pkgs, ... }: {
          options.services.realtimebus = {
            enable = lib.mkEnableOption "RealTimeBus";

            port = lib.mkOption {
              type = lib.types.port;
              default = 5000;
              description = "RealTimeBus backend port";
            };
          };

          config = lib.mkIf config.services.realtimebus.enable {
            systemd.services.realtimebus-backend = {
              description = "RealTimeBus Backend";
              after = [ "network.target" ];
              wantedBy = [ "multi-user.target" ];

              serviceConfig = {
                ExecStart = "${server}/bin/backend-server";
                Restart = "always";
                User = "nobody";
                Environment = [ "PORT=${toString config.services.realtimebus.port}" ];
                WorkingDirectory = "${server}";
              };
            };
          };
        };
      });
}
