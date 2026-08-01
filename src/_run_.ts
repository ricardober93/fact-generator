import { run, IProjectRunnerConfig } from '@wabot-dev/framework'

export const config: IProjectRunnerConfig = {}

export default config

// Solo en dev: arrancar inmediatamente.
if (process.env.WABOT_BUNDLED !== '1') {
  run(config)
}
