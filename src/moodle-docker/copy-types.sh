#!/bin/bash
set -e

ws_functions_file="../data/ws-function-types.ts"
ws_functions_list="../data/ws-functions.txt"
mkdir -p ../data

docker-compose down
[ -f "$ws_functions_file" ] && rm $ws_functions_file

docker-compose up -d

# Get the ID of the container running your service
container_id=$(docker-compose ps -q moodle)
echo "Copying files from container..."

# Copy Typescript files from the container to the CWD
max_retries=10
get_funcs=false

while true; do
  if ! $get_funcs; then
    docker cp "$(pwd)/get-docs.php" "$container_id:/opt/bitnami/moodleapp/scripts" 2>/dev/null
    docker exec "$container_id" php /opt/bitnami/moodleapp/scripts/get-docs.php /bitnami/moodle >$ws_functions_file || true
    if [ "$(wc -l <$ws_functions_file)" -gt 10 ]; then
      echo "TS generated file copied successfully"
      get_funcs=true
    fi
  fi

  if $get_funcs; then
    break
  fi

  sleep 1
  max_retries=$((max_retries - 1))

  if [ $max_retries -eq 0 ]; then
    echo "Failed to copy files."
    exit 1
  fi
done

docker-compose down

# Replace line comments with block comments
echo "Replacing line comments with block comments..."
cat $ws_functions_file | sed -E 's/(.*) \/\/ (.*)/\/** \2 *\/\n\1/' >ws-function-types-formatted.ts
mv ws-function-types-formatted.ts $ws_functions_file
cat moodle-types.ts >>$ws_functions_file

# Compile the Typescript file to get the required types
echo "Compiling Typescript file..."
tsc $ws_functions_file -d --emitDeclarationOnly

# Get functions
echo "Getting functions..."
cat $ws_functions_file | grep -Eo "Params of ([a-z0-9]+_?)+" | awk '{print $3}' | sort -u >$ws_functions_list
