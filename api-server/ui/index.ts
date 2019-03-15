import { ZonedDateTime } from 'js-joda'

const main = document.getElementById('main')
if (main) {
  main.innerText = `Signal K Stash: ${ZonedDateTime.now().toLocalTime()}`
}
