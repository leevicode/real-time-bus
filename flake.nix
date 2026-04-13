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
            if [ ! -d backend/node_modules ]; then
              echo "Installing backend dependencies..."
              (cd backend && npm ci)
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
            echo "  • Backend:  cd backend && npm run dev"
            echo "  • Frontend: cd app && npm run dev"
            echo ""

            # Add node_modules binaries to PATH.
            export PATH="$PWD/backend/node_modules/.bin:$PWD/app/node_modules/.bin:$PATH"
         '';
        };

        # Minimal dependency shell for CI.
        ciShell = pkgs.mkShell {
          buildInputs = with pkgs; [
            nodejs
          ];

          shellHook = ''
            echo "Installing dependencies..."
            (cd backend && npm ci)
            (cd app && npm ci)
          '';
        };

        # Build the backend as a Nix derivation.
        backend = pkgs.buildNpmPackage {
          name = "backend";
          src = ./backend;

          npmDepsHash = "sha256-kRFWCsBt7S1+12LfPWaWihoplB6l/vsIeDiao7E7ItI=";
          dontNpmBuild = true;

          configurePhase = ''
           runHook preConfigure
           npm ci
           runHook postConfigure
          '';

          installPhase = ''
            runHook preInstall
            mkdir -p $out
            cp -r . $out/
            mkdir -p "$out/bin"
            cat > $out/bin/backend-server << EOF
#!/bin/bash
export NODE_PATH="$out/node_modules"
exec ${nodejs}/bin/node $out/server.js
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
          inherit backend app;
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
                ExecStart = "${backend}/bin/backend-server";
                Restart = "always";
                User = "nobody";
                Environment = [ "PORT=${toString config.services.realtimebus.port}" ];
                WorkingDirectory = "${backend}";
              };
            };
          };
        };
      });
}
