# HDP Harness Local Diagnostics

[中文说明](README_zh.md)

HDP A1 is a small client plugin for DeepSeek Harness. It adds an **HDP 本地诊断** panel to the conversation header. One click displays up to three metadata events held in the current page's memory and disables the button when extraction succeeds.

Source version: `0.2.0-b7-minimal-fix-candidate`. The original version string is retained. This repository publishes the runtime source from the owner's 2026-10-03 delivery with MIT licensing and generic documentation.

## Behavior

The panel records client initialization, the page hostname guard result, and completion of a scoped extraction. Each record is bound to the current run identifier and build identifier. The store rejects invalid ownership and is disposed with the plugin lifecycle. The server entry point performs no operation.

The plugin source contains no chat-content reads, disk-record writes, model calls or network requests. It needs no API key for the panel. Its host application has separate networking and data behavior. A successful `SCOPED_RECORD_SET_COMPLETE` result means only that the scoped metadata extraction completed.

The origin guard recognizes `localhost`, `127.0.0.1`, `::1` and `[::1]`, case-insensitively. Other origins produce a denial record, which is still visible in the panel. This guard is diagnostic metadata; it is not an authorization system or a network access barrier.

## Try the source checks

Use a Node.js installation; the published checks were run on Node `v24.13.0`. There are no external test dependencies and no installation step is needed:

```sh
git clone https://github.com/hx303/hdp-harness-local-diagnostics.git
cd hdp-harness-local-diagnostics
node --check lib/client.js
node --check lib/server.mjs
node tests/verify-offline.mjs
```

Expected result: `PASS`, 13 tests. `npm test` runs the same commands. Tests simulate React and Cordis interfaces inside a Node VM; they do not launch DeepSeek Harness.

## Host installation and use

This is a source release for an existing compatible DeepSeek Harness installation. It includes no host installer and no automatic profile migration. See [installation and usage](docs/INSTALL.md) before integrating it into a host profile. The package declares the original `dsh` engine constraint `0.1.7-rc.2`; compatibility with other versions has not been validated by these checks.

In a correctly integrated host, open a conversation, expand **HDP 本地诊断**, and click **读取本次记录** once. On successful extraction the button becomes disabled. An absent panel or failure result requires a compatibility investigation; repeated clicks do not retry the operation in the same panel.

The original delivery's installer depended on a fixed machine layout and frozen host/profile hashes. Those machine-specific tools, personal configuration and recovery files are excluded. Their documented configuration mismatch means the frozen installer must not be represented as a portable working installer.

## Validation and scope

[Validation notes](docs/VALIDATION.md) distinguish checks run for this source release from historical delivery evidence. [Source provenance](SOURCE_PROVENANCE.json) records original hashes and publication changes. Runtime files and the Cordis patch remain byte-for-byte unchanged.

This panel does not implement an autonomous AI system, tool authorization, a policy enforcement gateway or host-wide security verification. Historical HDP research issues are outside its scope, and a full host installation has not been performed as part of this publication.

## License

[MIT](LICENSE) for this project's code, documentation and tests. Host-provided APIs and software retain their own terms; see [third-party notices](THIRD_PARTY_NOTICES.md).
