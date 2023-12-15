# srcsrv

`srcsrv` is a CLI that fetches a JavaScript file from a provided URL, extracts its source map, and writes the original source files to a specified output directory.

## Prerequisites

It is expected that you have [Bun](https://bun.sh/) installed.

## Install

```sh
bun install -g timhudson/srcsrv
```

## Usage

```
  ⌁ srcsrv [options] <url>

  Fetch and extract source files from a source map

  Options:

    -o, --output <output>   Output directory (default: ./.output)
    -n, --no-cache          Disable cache. Requests are cached by default (stored in .cache)

  Examples:

    srcsrv https://example.com/main.js
    srcsrv https://example.com/main.js -o ./output
    srcsrv https://example.com/main.js --no-cache
```

## License

Distributed under the MIT License

