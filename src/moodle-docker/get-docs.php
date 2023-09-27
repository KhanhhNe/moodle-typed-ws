<?php
# Enable verbose output
ini_set('display_errors', '1');
ini_set('display_startup_errors', '1');
error_reporting(E_ALL);

// This code is stealed from moodleapp/scripts/get-all-ws-structures.php
$cwd = getcwd();
$moodlepath = isset($argv[1]) ? $argv[1] : $cwd . '/moodle';

define('CLI_SCRIPT', true);

require($moodlepath . '/config.php');
require($CFG->dirroot . '/webservice/lib.php');
require_once('ws_to_ts_functions.php');

/**
 * Assign a value to a nested array path
 * @param array $arr
 * @param array $path
 * @param mixed $value
 * @return void
 */
function assoc_path(array &$arr, array $path, mixed $value)
{
  if (count($path) == 0) {
    return;
  }

  $key = array_shift($path);
  if (count($path) == 0) {
    $arr[$key] = $value;
  } else {
    if (!isset($arr[$key])) {
      $arr[$key] = [];
    }
    assoc_path($arr[$key], $path, $value);
  }
}

/**
 * Convert snake_case to camelCase
 * @param string $str
 * @return string
 */
function snake_to_camel(string $str): string
{
  return implode('', array_map('ucfirst', explode('_', $str)));
}

$structures = get_all_ws_structures();
$types = [];
$functions = [];

foreach ($structures as $wsname => $structure) {
  // Use ob_start to capture the output of print_ws_structure
  ob_start();
  remove_default_closures($structure->parameters_desc);
  print_ws_structure($wsname, $structure->parameters_desc, true);
  $params = ob_get_clean();
  $params_name = snake_to_camel($wsname) . 'WSParams';
  $types[] = $params;

  ob_start();
  remove_default_closures($structure->returns_desc);
  print_ws_structure($wsname, $structure->returns_desc, false);
  $returns = ob_get_clean();
  $returns_name = snake_to_camel($wsname) . 'WSResponse';
  $types[] = $returns;

  // Save function data
  $functions[$wsname] = [
    'description' => $structure->description,
    'params' => $params_name,
    'returns' => $returns_name,
  ];
}

$namespace = 'MoodleClientFunctionTypes';
$result = [];

foreach ($functions as $wsname => $funcdata) {
  // A_B_C....
  // -> namespace: [A, B]
  // -> funcname: [C, ...]
  $namespace_path = array_slice(preg_split('/_/', $wsname), 0, 2);
  $func_name = lcfirst(snake_to_camel(join('_', array_slice(preg_split('/_/', $wsname), 2))));

  // Assign the function type to the result
  $path = [...$namespace_path];
  $path[$last_key] = "\n/** " . $funcdata['description'] . " */" . $func_name;
  assoc_path(
    $result,
    $path,
    "(params: $namespace." . $funcdata['params'] . ") => Promise<$namespace." . $funcdata['returns'] . ">"
  );
}

// Result is JSON encoded, with some replacements to make it syntactically valid
$joined_types = join("\n", $types);
$encoded_result = str_replace('"', '', json_encode($result));
$encoded_result = str_replace('\n', "\n", $encoded_result);
$encoded_result = str_replace('\/', "/", $encoded_result);

// Print the resulting file
echo "/* eslint-disable */
export namespace $namespace {
  $joined_types
}

export type MoodleClientTypes = $encoded_result;
";