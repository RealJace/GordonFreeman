{ pkgs }: {
	deps = [
		pkgs.ffmpeg.bin
  pkgs.python39Full
  pkgs.nodejs-18_x
    pkgs.nodePackages.typescript-language-server
    pkgs.yarn
    pkgs.replitPackages.jest
	];
}