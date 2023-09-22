import { moodleTypesToJson } from './moodle-types-to-json'
import { parseMoodleSourceCode } from './parse'

void (async () => {
  parseMoodleSourceCode()
  await moodleTypesToJson()
})()
