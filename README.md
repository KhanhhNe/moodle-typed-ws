# Moodle Typed WebService

A fully typed Moodle WebService client library.

<a href="https://www.npmjs.com/package/moodle-typed-ws" rel="nofollow"><img src="https://img.shields.io/npm/dw/moodle-typed-ws.svg" alt="npm"></a>
<a href="https://www.npmjs.com/package/moodle-typed-ws" rel="nofollow"><img src="https://img.shields.io/github/stars/KhanhhNe/moodle-typed-ws" alt="stars"></a>

## Introduction

`moodle-typed-ws` is a TypeScript library aiming to provide a fully typed Moodle WebService client library. There are other alternatives on npm but they are either not typed at all or only partially typed manually by the author, which gives bad DX.

## Installation

From npm (Node/Bun)

```bash
npm install moodle-typed-ws       # npm
yarn add moodle-typed-ws          # yarn
bun add moodle-typed-ws           # bun
pnpm add moodle-typed-ws          # pnpm
```

## Usage

Get site information (using `Promise` callbacks)

```typescript
import { initializeClient } from 'moodle-typed-ws'

const moodle = initializeClient({
  baseUrl: 'https://moodle.example.com', // <-- Put your Moodle URL here
  token: 'exppsBdQwLvNwYRoAuaiBO5j0aWTzxU6', // <-- Put your token here
})

moodle.core.webservice // <-- with intellisense and type checking
  .getSiteInfo()
  .then((res) => console.log(res)) // <-- Response is typed
  .catch((err) => console.error(err.message))
```

Outputs

```json
{
  "sitename": "Site Name",
  "username": "...",
  "firstname": "...",
  "lastname": "...",
  "fullname": "...",
  "lang": "vi",
  "userid": ...,
  "siteurl": "https://site.url",
  "userpictureurl": "https://site.url/theme/image.php/boost/core/1685588876/u/f1",
  "functions": [...],
  "downloadfiles": 1,
  "uploadfiles": 1,
  ...
}
```

## Intellisense & Typechecking

## Where do I get the token?

Here is a link to Moodle documentation to help you out: https://docs.moodle.org/402/en/Security_keys

Basically, every moodle websites are different (since the Universities seems to prefer to customize their own moodle website). So the method to get the token will also differ, but most won't customize that much, so the documentation above should be enough.

## List of functions

Refer to this file for the list of functions [src/data/ws-functions.txt](https://github.com/KhanhhNe/moodle-typed-ws/blob/main/src/data/ws-functions.txt)

## Note regarding types

The types here is automatically generated so it should be up-to-date with the latest Moodle version. If you find any type that is not correct or other issues, please open a GitHub issue. I will try to fix it as soon as possible.

# Technical details

Turn out Moodle itself have a script that helps generating Typescript types for all WebService function params and returns, but hidden away in the [Moodleapp repository](https://github.com/moodlehq/moodleapp). It requires a working installation of Moodle, and that's where [Moodle Docker image](https://hub.docker.com/r/bitnami/moodle/) from Bitnami comes in handy.

Having all that, I just need to setup the Docker image, clone the Moodleapp repository into the Docker container, run the script and extract types that I needed. There are some tweaks, formatting, etc. that I need to do to make it work, including some shell scripting & parsing, but I'll keep it short here.

Then I implemented the Moodle WebService client using a Proxy object that will catch property you try to access, provide proper typing, and call the correct function when you invoke `apply()` or simply call it (like `moodle.core.webservices.getSiteInfo({})`)

# Technical details - old

> This is the old implementation, which is not used now but I keep it here for reference and for showing off. Read it if you like, the code is moved into [src/parse.old](https://github.com/KhanhhNe/moodle-typed-ws/tree/main/src/parse.old)

This library is generated from Moodle source code at [moodle/moodle](https://github.com/moodle/moodle). The parsing source code is located at [src/parse](https://github.com/KhanhhNe/moodle-typed-ws/tree/main/src/parse).

Basically it reads the PHP AST (Abstract Syntax Tree) using [php-parser](https://www.npmjs.com/package/php-parser), find the functions definitions (which are `<func_name>_parameters` and `<func_name>_returns`) and try to parse the PHP code into typing information, saved in a JSON file.

Then another code will reads the typing information, turn it into JSON Schema, then use [json-schema-to-typescript](https://www.npmjs.com/package/json-schema-to-typescript) to generate a `.d.ts` declaration file, and gather them into a `index.d.ts` file with imports.

The client is actually a `Proxy` object which will helps typing to infer correctly, and to call the correct Moodle WebService function when you try to invoke them without me having to define all the functions in code.
