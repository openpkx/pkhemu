#!/bin/bash
# Downloads the homebrew games the store screenshots show into data/store/games/<system>/, named as the library shows them.
set -euo pipefail

games="$(cd "$(dirname "$0")/../../.." && pwd)/data/store/games"
mkdir -p "$games"/{gb,gbc,gba,nds,n64}

fetch() {
  [ -f "$games/$2" ] && return
  echo "Downloading $2"
  curl -fsSL "$1" -o "$games/$2"
}

fetch https://github.com/sinusoid-studios/rhythm-land/releases/download/v1.0.1/rhythm-land.gb "gb/Rhythm Land.gb"
fetch https://github.com/pinobatch/libbet/releases/download/v0.08/libbet.gb "gb/Libbet and the Magic Floor.gb"
fetch https://github.com/AntonioND/ucity/releases/download/v1.3/ucity.gbc "gbc/µCity.gbc"
fetch https://raw.githubusercontent.com/AntonioND/geometrix/master/geometrix.gbc "gbc/Geometrix.gbc"
fetch https://github.com/vayan/collie-defense/releases/download/v1.0.0/collie-defence-v1.0.0.gba "gba/Collie Defense.gba"
fetch https://github.com/foopod/lro/releases/download/20211210/lro.gba "gba/Luggage Retrieval Officer.gba"
fetch https://github.com/lorenzolanglois/JamClown/releases/download/v1.0/jamclown.nds "nds/JamClown.nds"
fetch https://github.com/Warioware64/Traffic-Escape-DS/releases/download/v1.2/Traffic_Escape_DS.nds "nds/Traffic Escape.nds"
fetch https://github.com/vrgl117-games/sblobber64/releases/download/n64brew-jam-1/sblobber64.z64 "n64/sblobber64.z64"
fetch https://github.com/ptimonen/n64-riistahillo/releases/download/1.0/Kumi-Daiko-Beatoff-64.n64 "n64/Kumi-Daiko Beatoff 64.n64"

missing=0
manual() {
  if [ ! -f "$games/$2" ]; then
    echo "Download $1 by hand and save the ROM as data/store/games/$2"
    missing=1
  fi
}
manual "Tobu Tobu Girl from https://tangramgames.itch.io/tobutobugirl (tobu.gb in the zip)" "gb/Tobu Tobu Girl.gb"
manual "Tobu Tobu Girl Deluxe from https://tangramgames.itch.io/tobu-tobu-girl-deluxe (tobudx.gb)" "gbc/Tobu Tobu Girl Deluxe.gbc"
manual "Feline from https://foopod.itch.io/feline" "gba/Feline.gba"
exit $missing
