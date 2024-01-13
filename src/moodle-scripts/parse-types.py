import json
import re
import os
import urllib.request


def replace_every_line(pattern, repl, string):
    return "\n".join([re.sub(pattern, repl, line) for line in string.split("\n")])


def pipe(string, *functions):
    for function in functions:
        string = function(string)
    return string


def assoc_path(path, value, obj):
    if len(path) == 0:
        return value
    else:
        key = path[0]
        return {**obj, key: assoc_path(path[1:], value, obj.get(key, {}))}


def snake_to_camel(string, capitalize_first=False):
    camel = re.sub(r"_(.)", lambda m: m.group(1).upper(), string)
    if capitalize_first:
        camel = camel[0].upper() + camel[1:]

    return camel


def find_first(arr, func):
    found = [d for d in arr if func(d)]
    if len(found) != 1:
        print(found)
        raise Exception(f"Expected 1 found {len(found)}")

    return found[0]


origin_type = "https://raw.githubusercontent.com/moodlehq/moodle-local_moodlemobileapp/main/structure/master.ts"
ws_functions_file = os.path.join(
    os.path.dirname(__file__), "../data/ws-function-types.d.ts"
)
ws_functions_list = os.path.join(os.path.dirname(__file__), "../data/ws-functions.txt")

with urllib.request.urlopen(origin_type) as f:
    content = f.read().decode("utf-8")

content = pipe(
    content,
    # Convert inline comment to block comment
    lambda string: replace_every_line(r"(.*) // (.*)", r"/** \2 */\n\1", string),
    # Export everything
    lambda string: replace_every_line(r"^export (type .*)", r"\1", string),
)

functions = re.findall(r"Params of ([a-z0-9_]*)", content)
with open(ws_functions_list, "w+") as f:
    f.write("\n".join(sorted(set(functions))))


func_defs = {}
flattened_func_defs = {}
params = re.findall(r"(\S+WSParams)", content)
returns = re.findall(r"(\S+WSResponse)", content)

for full_func_name in functions:
    [namespace, module, func_name] = full_func_name.split("_", 2)
    func_name_camel = snake_to_camel(func_name)

    joined_name = f"{module}{func_name_camel}"

    def is_same(name):
        module_camel = snake_to_camel(module, True)
        func_name_camel = snake_to_camel(func_name, True)

        if namespace == "tool" and module in ["lp", "mobile"]:
            return f"{func_name_camel}WS" in name

        return (
            f"{module_camel}{func_name_camel}WS" in name
            or f"{module_camel}s{func_name_camel}WS" in name
        )

    param = find_first(params, is_same)
    ret = find_first(returns, is_same)
    comment_match = re.search(
        r"\* Params of " + full_func_name + r" WS.\s+\*\s+\* WS Description: (.*?)\n",
        content,
    )
    comment = comment_match.group(1) if comment_match else ""

    func_def = f"(params: Prettify<MoodleClientFunctionTypes.{param}>) => Promise<Prettify<MoodleClientFunctionTypes.{ret}>>"
    func_defs = assoc_path(
        [namespace, module, f"/** {comment} */ {func_name_camel}"],
        func_def,
        func_defs,
    )
    flattened_func_defs[f"'{namespace}.{module}.{func_name_camel}'"] = func_def


def func_defs_to_type(defs):
    return json.dumps(defs, indent=2).replace('"', "")


ws_functions_content = f"""
declare namespace MoodleClientFunctionTypes {{

  /** Structure of warnings returned by WS. */
  interface CoreWSExternalWarning {{
    /** Item. */
    item?: string

    /** Item id. */
    itemid?: number

    /** The warning code can be used by the client app to implement specific behaviour. */
    warningcode: string

    /** Untranslated english message to explain the warning. */
    message: string
  }}

  /** Structure of files returned by WS. */
  interface CoreWSExternalFile {{
    /** Downloadable file url. */
    fileurl: string
    /** File name. */
    filename?: string
    /** File path. */
    filepath?: string
    /** File size. */
    filesize?: number
    /** Time modified. */
    timemodified?: number
    /** File mime type. */
    mimetype?: string
    /** Whether is an external file. */
    isexternalfile?: number
    /** The repository type for external files. */
    repositorytype?: string
  }}

  {content}
}}

type Prettify<T> = T extends object
  ? {{
      [K in keyof T]: T[K] extends Record<string, unknown>
        ? Prettify<T[K]>
        : T[K]
    }} & {{}}
  : T extends (infer E)[]
    ? Prettify<E>[]
    : T

type MoodleClientTypes = {func_defs_to_type(func_defs)}

type MoodleClientFlattenedTypes = {func_defs_to_type(flattened_func_defs)}

export {{ MoodleClientFunctionTypes, type MoodleClientTypes, type MoodleClientFlattenedTypes }};
"""

with open(ws_functions_file, "w+") as f:
    f.write(ws_functions_content)
