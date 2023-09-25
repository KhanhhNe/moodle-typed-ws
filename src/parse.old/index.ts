import { moodleTypesToJson } from './moodle-types-to-json'
import { parseMoodleSourceCode } from './parse'

(async () => {
  parseMoodleSourceCode()
  await moodleTypesToJson()
})()
