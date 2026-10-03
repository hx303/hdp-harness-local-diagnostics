# 安装与使用指南

## 前提

需要已有的兼容 DeepSeek Harness 桌面宿主。插件依赖宿主的 `window.__ModuleLoader__`、React 模块、Cordis `ctx.effect` 以及 `ctx.slots.inject/register`，使用槽位 `conversation.header.leading`。

`package.json` 保留交付的 `dsh` engine 约束 `0.1.7-rc.2`。宿主及其 API 可独立变化；原交付记录中的核心版本字段与该约束不是同一版本字段，不能据此推出其他版本兼容。

宿主官方文档入口：[DeepSeek Harness](https://deepseek-harness.github.io/deepseek-harness/)。应由维护者按实际宿主版本选择受支持的本地插件加载方式。仓库不提供绕过宿主校验、覆盖现有 profile 或直接修改宿主 ASAR 的步骤。

## 源码准备

克隆仓库后运行根目录 README 中的源码检查。`lib/client.js`、`lib/server.mjs`、`cordis.patch.yml` 已是交付中的运行文件，不需要构建；测试也不需要下载依赖。

供本地包加载器使用的入口与元数据都在 `package.json` 中：服务端入口 `lib/server.mjs`，客户端入口 `lib/client.js`，bundle patch `cordis.patch.yml`。插件名保留为 `hdp-harness-b7-cso1-trusted-local-diagnostic`，避免破坏 patch 中的名称绑定。

若需要源码包，可用系统已有的 tar 工具从仓库根目录打包必需文件，不调用安装脚本：

```sh
tar -czf hdp-a1-source.tar.gz package.json cordis.patch.yml lib LICENSE README.md README_zh.md THIRD_PARTY_NOTICES.md SOURCE_PROVENANCE.json docs tests .gitignore
```

这只是可复现源码归档，不是经过宿主测试的安装包，不承诺某一宿主加载器接受该归档格式。不要把它代替原交付冻结安装器的输入。

当前宿主应由维护者备份其现有配置，并在隔离测试 profile 中完成加载、卸载、槽位与生命周期核验，然后再决定是否集成到日常使用环境。任一宿主接口或版本不匹配时停止集成；本仓库未验证任意电脑上的一键安装过程。

## 已集成环境的日常使用

1. 按原有方式打开 DeepSeek Harness，进入会话页面。
2. 展开会话页上方的 **HDP 本地诊断**。
3. 点击 **读取本次记录** 一次。
4. 成功时看到 `SCOPED_RECORD_SET_COMPLETE`，按钮变为不可点击。

记录最多三条，仅含当前插件运行的诊断元数据，不是聊天历史。页面关闭或插件生命周期结束后，不应将其视为可继续读取的历史记录。

## 异常处理

- 找不到面板：确认宿主加载了正确插件，并核对模块加载器、React 与 slots 接口。源码测试通过不代表宿主配置正确。
- 面板显示失败：记录状态名称供维护者检查即可；不需要上传聊天正文、页面截图或用户配置。当前面板仅尝试一次读取，连续点击不会重试。
- 需要卸载：由维护者使用该宿主版本支持的插件卸载方式。仓库没有通用恢复器，也不包含原交付的旧版恢复源码。

原交付中存在对特定电脑冻结配置的校验与停止机制。本次开源没有移除那些安装检查来制作自动安装器；相应机器专用脚本、配置和证明文件未再分发。
