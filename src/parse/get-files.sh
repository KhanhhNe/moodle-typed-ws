#!/bin/bash

grep -rl -E "@package +[a-z_]+" | grep "/external.php\|/externallib.php" | uniq -u | sort >files.txt
