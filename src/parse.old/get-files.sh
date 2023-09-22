#!/bin/bash

mkdir -p ./src/data
grep -rl -E "@package +[a-z_]+" | grep "/external.php\|/externallib.php" | uniq -u | sort >./src/data/files.txt
