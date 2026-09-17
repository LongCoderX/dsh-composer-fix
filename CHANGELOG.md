# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2026-09-17

### Added
- Initial release.
- Hero phase: hide right scrollbar; pin the composer to the bottom of
  the viewport via `position: absolute`; hide the orphan stats dock
  (`[data-composer-stats]`) that leaks from the previous session's
  token-usage summary.
- Active phase: pin the composer via `position: absolute`; reserve
  bottom padding equal to the composer height via
  `var(--dsh-composer-height, 0px) !important`; let the dialog width
  track the conversation column automatically by leaving
  `scrollBody`'s `position` unset so the absolute containing block
  resolves to the centerCol-tracked `wSkVaW_root`.
- Install via `cordis.patch.yml` `insert:` syntax; the Cordis HMR
  channel loads the plugin without a server restart.
