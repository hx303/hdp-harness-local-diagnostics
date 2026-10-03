# Third-party API and software notices

This source repository does not bundle DeepSeek Harness, React, Cordis, Node.js, host ASAR files, model SDKs, Python/Tcl/Tk/PyInstaller or other third-party implementations.

The client requests React from the host module loader and uses host-provided Cordis/slots APIs. These names describe integration requirements; this project's MIT license does not replace the terms of any independently obtained host or dependency.

Upstream references:

- DeepSeek Harness documentation: https://deepseek-harness.github.io/deepseek-harness/
- React source and license: https://github.com/facebook/react
- Cordis source and license: https://github.com/cordiverse/cordis
- Node.js source and license: https://github.com/nodejs/node

The offline tests use original interface stubs and Node built-in modules only. Any distribution that later includes actual third-party code or binaries must preserve their applicable notices and license terms separately.
